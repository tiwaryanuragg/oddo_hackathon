import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { badRequest, unauthorized, conflict } from "../utils/ApiError.js";
import { logActivity } from "../services/activityLog.js";

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  departmentId: u.departmentId,
});

// POST /api/auth/signup
// CRITICAL: role is hardcoded to 'Employee'. Any role field in the body is ignored.
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw badRequest("name, email and password are required");
  }
  if (String(password).length < 6) {
    throw badRequest("Password must be at least 6 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "Employee", // hardcoded — no self-elevation, ever
      status: "Active",
    },
  });

  await logActivity({ type: "AUTH", message: `New employee registered: ${user.email}`, actorId: user.id });

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw badRequest("email and password are required");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw unauthorized("Invalid credentials");
  if (user.status !== "Active") throw unauthorized("Account is inactive");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials");

  const token = signToken({ id: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { department: { select: { id: true, name: true } } },
  });
  res.json({ user: publicUser(user), department: user.department });
});
