import User from '../models/User.js';
import Department from '../models/Department.js';
import Category from '../models/Category.js';
import { ROLES, ASSIGNABLE_ROLES } from '../constants.js';
import { asyncHandler, ApiError, logActivity } from '../utils/helpers.js';

/* ------------------------------- Departments ------------------------------ */

export const listDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find()
    .populate('head', 'name email')
    .populate('parent', 'name')
    .sort({ createdAt: 1 });
  res.json({ departments });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const { name, head, parent, status } = req.body;
  if (!name) throw new ApiError(400, 'Department name is required');
  const dept = await Department.create({
    name,
    head: head || null,
    parent: parent || null,
    status: status || 'Active',
  });
  await logActivity({
    actor: req.user._id,
    action: 'department.create',
    message: `Created department "${name}"`,
    entityType: 'Department',
    entityId: dept._id,
  });
  res.status(201).json({ department: dept });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const { name, head, parent, status } = req.body;
  const dept = await Department.findById(req.params.id);
  if (!dept) throw new ApiError(404, 'Department not found');

  if (name !== undefined) dept.name = name;
  if (head !== undefined) dept.head = head || null;
  if (parent !== undefined) dept.parent = parent || null;
  if (status !== undefined) dept.status = status;
  await dept.save();

  await logActivity({
    actor: req.user._id,
    action: 'department.update',
    message: `Updated department "${dept.name}"`,
    entityType: 'Department',
    entityId: dept._id,
  });
  res.json({ department: dept });
});

/* ------------------------------- Categories ------------------------------- */

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find().sort({ createdAt: 1 });
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, customFields, status } = req.body;
  if (!name) throw new ApiError(400, 'Category name is required');
  const category = await Category.create({
    name,
    description: description || '',
    customFields: Array.isArray(customFields) ? customFields : [],
    status: status || 'Active',
  });
  await logActivity({
    actor: req.user._id,
    action: 'category.create',
    message: `Created category "${name}"`,
    entityType: 'Category',
    entityId: category._id,
  });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, customFields, status } = req.body;
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (customFields !== undefined) category.customFields = customFields;
  if (status !== undefined) category.status = status;
  await category.save();
  res.json({ category });
});

/* ---------------------------- Employee Directory --------------------------- */

export const listEmployees = asyncHandler(async (req, res) => {
  const { q, department, role } = req.query;
  const filter = {};
  if (department) filter.department = department;
  if (role) filter.role = role;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }
  const employees = await User.find(filter).populate('department', 'name').sort({ name: 1 });
  res.json({ employees: employees.map((u) => u.toSafeJSON()) });
});

// PATCH /api/org/employees/:id — the ONLY place roles are assigned (Admin only).
export const updateEmployee = asyncHandler(async (req, res) => {
  const { role, department, status, name } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Employee not found');

  if (role !== undefined) {
    if (![...ASSIGNABLE_ROLES, ROLES.ADMIN].includes(role)) {
      throw new ApiError(400, 'Invalid role');
    }
    // Guard: prevent removing the last remaining admin.
    if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) throw new ApiError(400, 'Cannot demote the last admin');
    }
    const prevRole = user.role;
    user.role = role;
    if (prevRole !== role) {
      await logActivity({
        actor: req.user._id,
        action: 'employee.role_change',
        message: `Changed ${user.name}'s role from ${prevRole} to ${role}`,
        entityType: 'User',
        entityId: user._id,
      });
    }
  }
  if (department !== undefined) user.department = department || null;
  if (status !== undefined) user.status = status;
  if (name !== undefined) user.name = name;
  await user.save();

  res.json({ employee: user.toSafeJSON() });
});