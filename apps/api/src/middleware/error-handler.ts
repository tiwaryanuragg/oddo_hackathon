import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiFailure } from '@assetflow/shared';
import { AppError } from '../core/errors/app-error.js';
import { ErrorCode } from '../core/errors/error-codes.js';
import { logger } from '../core/logger.js';
import { isProd } from '../config/env.js';

/**
 * The single translation layer from thrown errors → HTTP responses. Known
 * error shapes (AppError, ZodError, Prisma known-request errors) map to clean
 * client responses; everything else is treated as an unexpected 500 and logged
 * with its stack, never leaking internals to the client.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let failure: ApiFailure;
  let status = 500;

  if (err instanceof AppError) {
    status = err.statusCode;
    failure = {
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    };
  } else if (err instanceof ZodError) {
    status = 400;
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (details[key] ??= []).push(issue.message);
    }
    failure = {
      success: false,
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Validation failed', details },
    };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    ({ status, failure } = mapPrismaError(err));
  } else {
    logger.error({ err }, 'Unhandled error');
    failure = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL,
        message: isProd ? 'Something went wrong' : String((err as Error)?.message ?? err),
      },
    };
  }

  if (status >= 500) logger.error({ err }, failure.error.message);

  res.status(status).json(failure);
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  failure: ApiFailure;
} {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return {
        status: 409,
        failure: {
          success: false,
          error: { code: ErrorCode.CONFLICT, message: `A record with this ${target} already exists` },
        },
      };
    }
    case 'P2025':
      return {
        status: 404,
        failure: { success: false, error: { code: ErrorCode.NOT_FOUND, message: 'Resource not found' } },
      };
    case 'P2003':
      return {
        status: 409,
        failure: {
          success: false,
          error: { code: ErrorCode.CONFLICT, message: 'Related record constraint failed' },
        },
      };
    default:
      return {
        status: 500,
        failure: { success: false, error: { code: ErrorCode.INTERNAL, message: 'Database error' } },
      };
  }
}
