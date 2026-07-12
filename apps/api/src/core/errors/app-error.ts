import { ErrorCode, type ErrorCodeValue } from './error-codes.js';

/**
 * The one error type domain/service code throws. Carries an HTTP status, a
 * stable machine code, and optional field-level details. The global error
 * handler is the ONLY place that translates these into HTTP responses.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeValue;
  readonly details?: Record<string, string[]>;
  /** true for expected business errors; false/absent for programmer bugs. */
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: ErrorCodeValue,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, details?: Record<string, string[]>) {
    return new AppError(400, ErrorCode.VALIDATION_ERROR, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(401, ErrorCode.AUTH_UNAUTHENTICATED, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, ErrorCode.AUTH_FORBIDDEN, message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, ErrorCode.NOT_FOUND, message);
  }
  static conflict(message: string, code: ErrorCodeValue = ErrorCode.CONFLICT) {
    return new AppError(409, code, message);
  }
  static invalidTransition(message: string) {
    return new AppError(409, ErrorCode.INVALID_STATE_TRANSITION, message);
  }
  static internal(message = 'Something went wrong') {
    return new AppError(500, ErrorCode.INTERNAL, message);
  }
}
