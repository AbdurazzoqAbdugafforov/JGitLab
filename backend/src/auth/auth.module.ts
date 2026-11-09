import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';
import { OAuthService } from './oauth.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthGuard, AdminGuard, OAuthService],
  exports: [AuthGuard, AdminGuard, OAuthService],
})
export class AuthModule {}
