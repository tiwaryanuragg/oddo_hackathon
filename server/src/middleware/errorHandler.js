import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  // Prisma known errors
  if (err.code === "P2002") {
    statusCode = 409;
    message = `Unique constraint failed on: ${err.meta?.target?.join(", ") || "field"}`;
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = "Requested record not found";
  } else if (err.code === "P2003") {
    statusCode = 400;
    message = "Invalid reference to a related record";
  }

  if (statusCode >= 500) {
    console.error("[ERROR]", err);
  }

  res.status(statusCode).json({
    error: message,
    ...(details ? { details } : {}),
    ...(env.nodeEnv === "development" && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};
