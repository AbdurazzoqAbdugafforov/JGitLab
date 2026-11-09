import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
    private readonly db: DatabaseService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    let rawToken: string | null = null;

    const authHeader = req.headers['authorization'];
    if (
      typeof authHeader === 'string' &&
      authHeader.toLowerCase().startsWith('bearer ')
    ) {
      rawToken = authHeader.slice(7).trim();
    } else {
      const cookies = this.security.parseCookies(req);
      if (cookies[this.config.SESSION_COOKIE_NAME]) {
        rawToken = cookies[this.config.SESSION_COOKIE_NAME];
      }
    }

    if (!rawToken) {
      throw new UnauthorizedException({
        detail: {
          message: 'Authentication required',
          code: 'unauthenticated',
        },
        message: 'Authentication required',
      });
    }

    const session = this.db.resolveSession(rawToken);
    if (!session) {
      throw new UnauthorizedException({
        detail: {
          message: 'Your session has expired. Please sign in again.',
          code: 'session_expired',
        },
        message: 'Your session has expired. Please sign in again.',
      });
    }

    const user = this.db.store.users.find((u) => u.id === session.user_id);
    if (!user) {
      throw new UnauthorizedException({
        detail: {
          message: 'Account not found',
          code: 'session_expired',
        },
        message: 'Account not found',
      });
    }

    if (!user.is_active) {
      throw new ForbiddenException('This account has been deactivated.');
    }

    (req as any).user = user;
    (req as any).session = session;
    return true;
  }
}
