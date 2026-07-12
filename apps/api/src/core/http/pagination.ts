import { z } from 'zod';
import { PAGINATION } from '@assetflow/shared';

/**
 * Reusable pagination/sort/search query schema. Feature list-schemas `.extend`
 * this with their own filters, so paging semantics stay identical everywhere.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().min(1).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Convert page/limit into Prisma skip/take. */
export function toSkipTake(query: { page: number; limit: number }): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

/**
 * Resolve a client-supplied sort column against an allow-list, defending against
 * arbitrary/invalid `orderBy` fields reaching Prisma.
 */
export function resolveSortBy<T extends string>(
  requested: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(requested as T) ? (requested as T) : fallback;
}
