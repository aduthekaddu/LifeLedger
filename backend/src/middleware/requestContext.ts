import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = uuid();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
