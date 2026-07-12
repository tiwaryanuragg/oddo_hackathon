import type { Request, Response } from 'express';
import { ErrorCode } from '../core/errors/error-codes.js';

/** Terminal 404 for unmatched routes, in the standard failure envelope. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: ErrorCode.NOT_FOUND, message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}
