import { verifyToken } from "../utils/jwt.js";
import { prisma } from "../config/prisma.js";
import { unauthorized, forbidden } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Extracts and verifies JWT, loads the user, attaches { id, role, ... } to req.user.
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw unauthorized("Missing authentication token");

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    throw unauthorized("Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, name: true, email: true, role: true, status: true, departmentId: true },
  });
  if (!user) throw unauthorized("User no longer exists");
  if (user.status !== "Active") throw forbidden("Account is inactive");

  req.user = user;
  next();
});

// Role-based route guard. Usage: authorize('Admin', 'AssetManager')
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(forbidden("You do not have permission to perform this action"));
    }
    next();
  };
