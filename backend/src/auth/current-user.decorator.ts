import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionEntity, UserEntity } from '../database/entities';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.session;
  },
);
