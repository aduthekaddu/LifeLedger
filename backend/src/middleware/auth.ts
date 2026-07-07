import jwt, { type SignOptions } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { unauthorized, forbidden } from '../utils/errors';
import type { AuthUser, Role } from '../types/domain';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, ...value] = cookie.trim().split('=');
      return [key, decodeURIComponent(value.join('='))];
    }),
  );
}

function tokenFromRequest(req: Request): string | undefined {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }

  return parseCookies(req.headers.cookie).ll_session;
}

export function signSession(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] },
  );
}

export function attachSessionCookie(res: Response, token: string): void {
  res.cookie('ll_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie('ll_session', { path: '/' });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = tokenFromRequest(req);
  if (!token) {
    throw unauthorized();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    };
    next();
  } catch {
    throw unauthorized('Invalid or expired session');
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw forbidden('Your role cannot perform this action');
    }

    next();
  };
}
