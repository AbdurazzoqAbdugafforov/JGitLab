import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '../core/config.service';
import { UserEntity } from '../database/entities';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user as UserEntity | undefined;

    if (!user) {
      throw new UnauthorizedException({
        detail: {
          message: 'Authentication required before verifying admin privileges',
          code: 'unauthenticated',
        },
        message: 'Authentication required',
      });
    }

    if (!user.is_active) {
      throw new ForbiddenException({
        detail: {
          message: 'Account is deactivated',
          code: 'account_inactive',
        },
        message: 'Account is deactivated',
      });
    }

    const isEnvAdmin = this.config.isEmailAdmin(user.email);
    const isAdmin = isEnvAdmin || user.role === 'admin' || user.is_superuser === true;
    if (!isAdmin) {
      throw new ForbiddenException({
        detail: {
          message: 'Access denied: System Administrator privileges required.',
          code: 'admin_required',
        },
        message: 'Access denied: System Administrator privileges required.',
      });
    }

    return true;
  }
}
