import { z } from 'zod';
import { Role, UserStatus } from '@assetflow/shared';
import { paginationQuerySchema } from '../../../core/http/pagination.js';

export const userListQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'lastLoginAt']).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  departmentId: z.string().min(1).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  jobTitle: z.string().trim().max(100).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  departmentId: z.string().min(1).nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const promoteUserSchema = z.object({
  role: z.nativeEnum(Role),
  reason: z.string().trim().max(500).optional(),
});

export const userIdParamSchema = z.object({ id: z.string().min(1) });

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type PromoteUserInput = z.infer<typeof promoteUserSchema>;
