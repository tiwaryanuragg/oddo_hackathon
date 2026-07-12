import User from '../models/User.js';
import crypto from 'crypto';
import { ROLES } from '../constants.js';
import { asyncHandler, ApiError, logActivity } from '../utils/helpers.js';
import { signToken } from '../middleware/auth.js';

// POST /api/auth/signup — always creates an Employee. No role selection at signup.
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required');
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const user = new User({ name, email, role: ROLES.EMPLOYEE });
  await user.setPassword(password);
  await user.save();

  await logActivity({
    actor: user._id,
    action: 'auth.signup',
    message: `${user.name} signed up as an employee`,
    entityType: 'User',
    entityId: user._id,
  });

  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeJSON() });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.verifyPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.status !== 'Active') throw new ApiError(403, 'Account is inactive, contact your admin');

  const token = signToken(user);
  res.json({ token, user: user.toSafeJSON() });
});

// GET /api/auth/me — validate session, return current user.
export const me = asyncHandler(async (req, res) => {
  const user = await req.user.populate('department', 'name');
  res.json({ user: user.toSafeJSON() });
});

// POST /api/auth/forgot-password — generates a short-lived reset token.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save();

  // Return token in response for now (hackathon mode). A production setup should send this via email.
  res.json({
    message: 'If that email exists, a reset link has been sent.',
    resetToken,
    expiresInMinutes: 15,
  });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new ApiError(400, 'Token and new password are required');
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  });
  if (!user) throw new ApiError(400, 'Reset token is invalid or expired');

  await user.setPassword(password);
  user.clearPasswordResetToken();
  await user.save();

  await logActivity({
    actor: user._id,
    action: 'auth.password_reset',
    message: `${user.name} reset their password`,
    entityType: 'User',
    entityId: user._id,
  });

  const authToken = signToken(user);
  res.json({ token: authToken, user: user.toSafeJSON() });
});