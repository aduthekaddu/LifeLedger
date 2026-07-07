import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'not_found', `No route found for ${req.method} ${req.path}`));
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(500, 'internal_error', 'Something went wrong');

  logger.error('Request failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    stack: env.nodeEnv === 'development' ? error.stack : undefined,
  });

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      requestId: req.requestId,
      ...(env.nodeEnv === 'development' && appError.details ? { details: appError.details } : {}),
    },
  });
}
