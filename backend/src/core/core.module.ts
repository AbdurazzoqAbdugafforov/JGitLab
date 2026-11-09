import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { SecurityService } from './security.service';
import { WebSocketService } from './websocket.service';

@Global()
@Module({
  providers: [ConfigService, SecurityService, WebSocketService],
  exports: [ConfigService, SecurityService, WebSocketService],
})
export class CoreModule {}
