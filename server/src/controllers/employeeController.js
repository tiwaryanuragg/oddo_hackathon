import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/ApiError.js";
import { logActivity } from "../services/activityLog.js";

const ASSIGNABLE_ROLES = ["Admin", "AssetManager", "DepartmentHead", "Employee"];

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  departmentId: u.departmentId,
  department: u.department || null,
});

// GET /api/employees   (Admin) — the Employee Directory
export const listEmployees = asyncHandler(async (req, res) => {
  const { role, status, q } = req.query;
  const employees = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { department: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ employees: employees.map(publicUser) });
});

// GET /api/employees/:id  (Admin)
export const getEmployee = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!user) throw notFound("Employee not found");
  res.json({ employee: publicUser(user) });
});

// PATCH /api/employees/:id/role  (Admin) — promote / assign role
// This is the ONLY path by which a role changes. Signup can never do this.
export const updateEmployeeRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    throw badRequest(`role must be one of: ${ASSIGNABLE_ROLES.join(", ")}`);
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("Employee not found");

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    include: { department: { select: { id: true, name: true } } },
  });

  await logActivity({
    type: "ROLE",
    message: `Role changed for ${user.email}: ${existing.role} → ${role}`,
    recipientId: user.id,
    actorId: req.user.id,
  });

  res.json({ employee: publicUser(user) });
});

// PATCH /api/employees/:id/department  (Admin)
export const updateEmployeeDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { departmentId } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("Employee not found");

  if (departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw badRequest("Target department does not exist");
  }

  const user = await prisma.user.update({
    where: { id },
    data: { departmentId: departmentId || null },
    include: { department: { select: { id: true, name: true } } },
  });

  await logActivity({
    type: "DEPARTMENT",
    message: `${user.email} assigned to department ${user.department?.name || "none"}`,
    recipientId: user.id,
    actorId: req.user.id,
  });

  res.json({ employee: publicUser(user) });
});

// PATCH /api/employees/:id/status  (Admin) — activate / deactivate
export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["Active", "Inactive"].includes(status)) {
    throw badRequest("status must be 'Active' or 'Inactive'");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("Employee not found");

  const user = await prisma.user.update({
    where: { id },
    data: { status },
    include: { department: { select: { id: true, name: true } } },
  });

  await logActivity({
    type: "USER",
    message: `${user.email} status set to ${status}`,
    recipientId: user.id,
    actorId: req.user.id,
  });

  res.json({ employee: publicUser(user) });
});
