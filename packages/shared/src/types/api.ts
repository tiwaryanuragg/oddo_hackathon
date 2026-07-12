/** Transport-level contracts. Every API response is one of these shapes. */

export interface ApiError {
  /** Machine-readable, stable across releases (e.g. "AUTH_INVALID_CREDENTIALS"). */
  code: string;
  /** Human-readable message safe to surface to end users. */
  message: string;
  /** Field-level validation issues, keyed by dot-path (e.g. "email"). */
  details?: Record<string, string[]>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
