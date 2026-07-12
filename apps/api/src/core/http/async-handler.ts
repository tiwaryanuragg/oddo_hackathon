import type { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Wraps an async controller so any thrown/rejected error is forwarded to the
 * central error middleware instead of crashing the process. Removes the
 * try/catch boilerplate from every handler.
 */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
