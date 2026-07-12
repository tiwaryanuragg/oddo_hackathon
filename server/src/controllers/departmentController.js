import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound } from "../utils/ApiError.js";
import { logActivity } from "../services/activityLog.js";

const withRelations = {
  head: { select: { id: true, name: true, email: true } },
  parentDepartment: { select: { id: true, name: true } },
  _count: { select: { members: true, assets: true, childDepartments: true } },
};

// GET /api/departments
export const listDepartments = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const departments = await prisma.department.findMany({
    where: status ? { status } : {},
    include: withRelations,
    orderBy: { name: "asc" },
  });
  res.json({ departments });
});

// GET /api/departments/:id
export const getDepartment = asyncHandler(async (req, res) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: {
      ...withRelations,
      members: { select: { id: true, name: true, email: true, role: true } },
      childDepartments: { select: { id: true, name: true, status: true } },
    },
  });
  if (!department) throw notFound("Department not found");
  res.json({ department });
});

// POST /api/departments  (Admin)
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, headUserId, parentDepartmentId } = req.body;
  if (!name) throw badRequest("Department name is required");

  const department = await prisma.department.create({
    data: {
      name,
      headUserId: headUserId || null,
      parentDepartmentId: parentDepartmentId || null,
    },
    include: withRelations,
  });

  // If a head is assigned, ensure they carry the DepartmentHead role.
  if (headUserId) {
    await prisma.user.update({
      where: { id: headUserId },
      data: { role: "DepartmentHead", departmentId: department.id },
    });
  }

  await logActivity({
    type: "DEPARTMENT",
    message: `Department created: ${department.name}`,
    actorId: req.user.id,
  });

  res.status(201).json({ department });
});

// PATCH /api/departments/:id  (Admin)
export const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, headUserId, parentDepartmentId, status } = req.body;

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw notFound("Department not found");

  if (parentDepartmentId && parentDepartmentId === id) {
    throw badRequest("A department cannot be its own parent");
  }

  const department = await prisma.department.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(headUserId !== undefined ? { headUserId: headUserId || null } : {}),
      ...(parentDepartmentId !== undefined
        ? { parentDepartmentId: parentDepartmentId || null }
        : {}),
      ...(status !== undefined ? { status } : {}),
    },
    include: withRelations,
  });

  if (headUserId) {
    await prisma.user.update({
      where: { id: headUserId },
      data: { role: "DepartmentHead", departmentId: department.id },
    });
  }

  await logActivity({
    type: "DEPARTMENT",
    message: `Department updated: ${department.name}`,
    actorId: req.user.id,
  });

  res.json({ department });
});

// DELETE /api/departments/:id  (Admin) — soft deactivate
export const deactivateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw notFound("Department not found");

  const department = await prisma.department.update({
    where: { id },
    data: { status: "Inactive" },
    include: withRelations,
  });

  await logActivity({
    type: "DEPARTMENT",
    message: `Department deactivated: ${department.name}`,
    actorId: req.user.id,
  });

  res.json({ department });
});
