import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Edge validation. Each provided schema parses its request part; on success the
 * parsed (coerced, stripped) value replaces the raw input so controllers work
 * with typed data. ZodErrors bubble to the central error handler → 400 with
 * field-level `details`.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) {
      // req.query has only a getter in Express 5-style setups; assign defensively.
      Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query), writable: true });
    }
    if (schemas.body) req.body = schemas.body.parse(req.body);
    next();
  };
}
