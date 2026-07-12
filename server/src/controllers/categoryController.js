import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, conflict } from "../utils/ApiError.js";
import { logActivity } from "../services/activityLog.js";

// Normalizes an array of custom field definitions.
function normalizeCustomFields(fields) {
  if (fields === undefined) return undefined;
  if (!Array.isArray(fields)) throw badRequest("customFields must be an array");
  return fields.map((f) => {
    if (!f || typeof f !== "object" || !f.key || !f.label) {
      throw badRequest("Each custom field needs a 'key' and 'label'");
    }
    return {
      key: String(f.key),
      label: String(f.label),
      type: f.type || "text", // text | number | date | select | boolean
      options: Array.isArray(f.options) ? f.options : [],
      required: Boolean(f.required),
    };
  });
}

// GET /api/categories
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await prisma.assetCategory.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
});

// GET /api/categories/:id
export const getCategory = asyncHandler(async (req, res) => {
  const category = await prisma.assetCategory.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { assets: true } } },
  });
  if (!category) throw notFound("Category not found");
  res.json({ category });
});

// POST /api/categories  (Admin)
export const createCategory = asyncHandler(async (req, res) => {
  const { name, customFields } = req.body;
  if (!name) throw badRequest("Category name is required");

  const existing = await prisma.assetCategory.findUnique({ where: { name } });
  if (existing) throw conflict("A category with this name already exists");

  const category = await prisma.assetCategory.create({
    data: { name, customFields: normalizeCustomFields(customFields) ?? [] },
  });

  await logActivity({
    type: "CATEGORY",
    message: `Asset category created: ${category.name}`,
    actorId: req.user.id,
  });

  res.status(201).json({ category });
});

// PATCH /api/categories/:id  (Admin)
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, customFields } = req.body;

  const existing = await prisma.assetCategory.findUnique({ where: { id } });
  if (!existing) throw notFound("Category not found");

  const normalized = normalizeCustomFields(customFields);

  const category = await prisma.assetCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(normalized !== undefined ? { customFields: normalized } : {}),
    },
  });

  await logActivity({
    type: "CATEGORY",
    message: `Asset category updated: ${category.name}`,
    actorId: req.user.id,
  });

  res.json({ category });
});

// DELETE /api/categories/:id  (Admin)
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const count = await prisma.asset.count({ where: { categoryId: id } });
  if (count > 0) {
    throw conflict(`Cannot delete: ${count} asset(s) still use this category`);
  }
  await prisma.assetCategory.delete({ where: { id } });

  await logActivity({
    type: "CATEGORY",
    message: `Asset category deleted: ${id}`,
    actorId: req.user.id,
  });

  res.json({ success: true });
});
