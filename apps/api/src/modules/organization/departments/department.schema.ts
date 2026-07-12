import { z } from 'zod';
import { paginationQuerySchema } from '../../../core/http/pagination.js';

const code = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9_-]+$/, 'Code may contain only letters, numbers, hyphen and underscore')
  .transform((v) => v.toUpperCase());

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code,
  description: z.string().trim().max(500).optional(),
  managerId: z.string().min(1).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: code.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  managerId: z.string().min(1).nullable().optional(),
});

export const departmentListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(['name', 'code', 'createdAt']).optional(),
});

export const departmentIdParamSchema = z.object({ id: z.string().min(1) });

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;
