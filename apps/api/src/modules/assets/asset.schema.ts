import { z } from 'zod';
import { AssetCondition, AssetStatus } from '@assetflow/shared';

// ─── Param / query helpers ────────────────────────────────────────────────────

export const assetIdParamSchema = z.object({
  id: z.string().cuid({ message: 'Invalid asset id' }),
});

export const assetQrQuerySchema = z.object({
  format: z.enum(['svg', 'png']).default('svg'),
});

// ─── Registration ─────────────────────────────────────────────────────────────

export const registerAssetSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),

  categoryId: z.string().cuid({ message: 'Invalid category id' }),
  departmentId: z.string().cuid({ message: 'Invalid department id' }).optional(),

  serialNumber: z.string().max(200).optional(),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  location: z.string().max(500).optional(),

  condition: z.nativeEnum(AssetCondition).default(AssetCondition.NEW),

  purchaseDate: z.coerce.date().optional(),
  purchaseCost: z.number().nonnegative().optional(),
  warrantyExpiry: z.coerce.date().optional(),

  // Override category defaults for depreciation
  usefulLifeMonths: z.number().int().positive().optional(),
  depreciationRate: z.number().min(0).max(100).optional(),
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateAssetSchema = registerAssetSchema.partial().extend({
  // Allow overriding assignedTo during manual admin edits
  assignedToId: z.string().cuid().optional().nullable(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

// ─── Status Change ────────────────────────────────────────────────────────────

export const changeStatusSchema = z.object({
  status: z.nativeEnum(AssetStatus),
  note: z.string().max(1000).optional(),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

// ─── Retire ───────────────────────────────────────────────────────────────────

export const retireAssetSchema = z.object({
  reason: z.string().min(10).max(2000),
});

export type RetireAssetInput = z.infer<typeof retireAssetSchema>;

// ─── List / Search ────────────────────────────────────────────────────────────

export const assetQuerySchema = z.object({
  search: z.string().max(200).optional(),

  status: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),

  condition: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    ),

  categoryId: z.string().cuid().optional(),
  departmentId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),

  purchasedAfter: z.coerce.date().optional(),
  purchasedBefore: z.coerce.date().optional(),

  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  sortBy: z
    .enum(['name', 'assetTag', 'status', 'condition', 'purchaseDate', 'createdAt', 'currentValue'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type AssetQuery = z.infer<typeof assetQuerySchema>;
