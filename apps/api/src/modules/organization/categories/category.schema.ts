import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  defaultDepreciationRate: z.number().min(0).max(100).nullable().optional(),
  defaultUsefulLifeMonths: z.number().int().min(1).max(1200).nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  defaultDepreciationRate: z.number().min(0).max(100).nullable().optional(),
  defaultUsefulLifeMonths: z.number().int().min(1).max(1200).nullable().optional(),
});

export const categoryListQuerySchema = z.object({
  view: z.enum(['tree', 'flat']).default('tree'),
});

export const categoryIdParamSchema = z.object({ id: z.string().min(1) });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
