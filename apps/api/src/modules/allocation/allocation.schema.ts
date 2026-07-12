import { z } from 'zod';
import { AllocationStatus, TransferStatus, ReturnStatus, AssetCondition } from '@assetflow/shared';

// ─── Shared param schema ──────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().cuid({ message: 'Invalid id' }),
});

// ─── Allocation — Issue ───────────────────────────────────────────────────────

export const issueAllocationSchema = z.object({
  assetId:  z.string().cuid({ message: 'Invalid asset id' }),
  holderId: z.string().cuid({ message: 'Invalid holder id' }),
  dueDate:  z.coerce.date().optional(),
  note:     z.string().max(2000).optional(),
});

export type IssueAllocationInput = z.infer<typeof issueAllocationSchema>;

// ─── Allocation — Revoke ──────────────────────────────────────────────────────

export const revokeAllocationSchema = z.object({
  reason: z.string().min(5).max(2000),
});

export type RevokeAllocationInput = z.infer<typeof revokeAllocationSchema>;

// ─── Allocation — List / Filter ───────────────────────────────────────────────

export const allocationQuerySchema = z.object({
  status:    z.nativeEnum(AllocationStatus).optional(),
  holderId:  z.string().cuid().optional(),
  assetId:   z.string().cuid().optional(),
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  sortBy:    z.enum(['allocatedAt', 'dueDate', 'createdAt']).default('allocatedAt'),
  sortDir:   z.enum(['asc', 'desc']).default('desc'),
});

export type AllocationQuery = z.infer<typeof allocationQuerySchema>;

// ─── Transfer Request — Create ────────────────────────────────────────────────

export const createTransferSchema = z.object({
  assetId:  z.string().cuid({ message: 'Invalid asset id' }),
  toUserId: z.string().cuid({ message: 'Invalid target user id' }),
  reason:   z.string().max(2000).optional(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

// ─── Transfer Request — Decide ────────────────────────────────────────────────

export const decideTransferSchema = z.object({
  decision:     z.enum(['approve', 'reject']),
  decisionNote: z.string().max(2000).optional(),
});

export type DecideTransferInput = z.infer<typeof decideTransferSchema>;

// ─── Transfer Request — List ──────────────────────────────────────────────────

export const transferQuerySchema = z.object({
  status:   z.nativeEnum(TransferStatus).optional(),
  assetId:  z.string().cuid().optional(),
  fromUserId: z.string().cuid().optional(),
  toUserId:   z.string().cuid().optional(),
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

export type TransferQuery = z.infer<typeof transferQuerySchema>;

// ─── Return — Request ─────────────────────────────────────────────────────────

export const requestReturnSchema = z.object({
  allocationId:      z.string().cuid({ message: 'Invalid allocation id' }),
  reportedCondition: z.nativeEnum(AssetCondition),
  note:              z.string().max(2000).optional(),
});

export type RequestReturnInput = z.infer<typeof requestReturnSchema>;

// ─── Return — Process (Approve/Reject) ───────────────────────────────────────

export const processReturnSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note:     z.string().max(2000).optional(),
});

export type ProcessReturnInput = z.infer<typeof processReturnSchema>;

// ─── Return — List ────────────────────────────────────────────────────────────

export const returnQuerySchema = z.object({
  status:       z.nativeEnum(ReturnStatus).optional(),
  allocationId: z.string().cuid().optional(),
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
});

export type ReturnQuery = z.infer<typeof returnQuerySchema>;
