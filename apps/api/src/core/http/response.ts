import type { Response } from 'express';
import type { ApiSuccess, Paginated, PaginationMeta } from '@assetflow/shared';

/** Uniform success envelope. Every controller returns through these helpers. */
export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>): void {
  const body: ApiSuccess<T> = { success: true, data, ...(meta ? { meta } : {}) };
  res.status(status).json(body);
}

export function created<T>(res: Response, data: T): void {
  ok(res, data, 201);
}

export function noContent(res: Response): void {
  res.status(204).send();
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, pagination: buildPaginationMeta(total, page, limit) };
}
