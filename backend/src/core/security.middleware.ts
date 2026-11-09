import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from './config.service';
import { SecurityService } from './security.service';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const CSRF_EXEMPT_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/github/webhook',
];

const RATE_LIMITS: Array<[string, number, number]> = [
  ['/api/v1/auth/login', 20, 60],
  ['/api/v1/auth/register', 10, 60],
  ['/api/v1/auth/oauth/', 30, 60],
  ['/api/v1/providers/validate', 20, 60],
  ['/api/v1/github/app/', 30, 60],
  ['/api/v1/agent/tasks', 90, 60],
];

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 1. Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    const urlPath = (req.originalUrl || req.url || '').split('?')[0];
    if (urlPath.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }

    // 2. Rate limiting (skip in test mode)
    if (!this.config.isTest) {
      for (const [prefix, limit, windowSec] of RATE_LIMITS) {
        if (urlPath.startsWith(prefix)) {
          const ip = this.security.getClientIp(req) || 'unknown';
          const key = `${prefix}|${ip}`;
          const now = Date.now() / 1000;
          const timestamps = this.hits.get(key) || [];
          while (timestamps.length > 0 && now - timestamps[0] > windowSec) {
            timestamps.shift();
          }
          if (timestamps.length >= limit) {
            res.setHeader('Retry-After', String(windowSec));
            res.status(429).json({
              detail:
                'Too many requests. Please wait a moment and try again.',
              code: 'rate_limited',
            });
            return;
          }
          timestamps.push(now);
          this.hits.set(key, timestamps);
          break;
        }
      }
    }

    // 3. CSRF Double-Submit Check for Cookie-Authenticated State-Changing Requests
    if (
      UNSAFE_METHODS.has(req.method.toUpperCase()) &&
      !CSRF_EXEMPT_PREFIXES.some((prefix) => urlPath.startsWith(prefix))
    ) {
      const cookies = this.security.parseCookies(req);
      const hasSessionCookie = Boolean(
        cookies[this.config.SESSION_COOKIE_NAME],
      );
      const authHeader = (req.headers['authorization'] || '').toString();
      const hasBearer = authHeader.toLowerCase().startsWith('bearer ');

      if (hasSessionCookie && !hasBearer) {
        const csrfCookie = cookies[this.config.CSRF_COOKIE_NAME] || '';
        const csrfHeader = (req.headers['x-csrf-token'] || '').toString();
        const cookieBuf = Buffer.from(csrfCookie);
        const headerBuf = Buffer.from(csrfHeader);
        if (
          !csrfCookie ||
          !csrfHeader ||
          cookieBuf.length !== headerBuf.length ||
          !crypto.timingSafeEqual(cookieBuf, headerBuf)
        ) {
          res.status(403).json({
            detail:
              'CSRF validation failed. Refresh the page and try again.',
            code: 'csrf_failed',
          });
          return;
        }
      }
    }

    next();
  }
}
