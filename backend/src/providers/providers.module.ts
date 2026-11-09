import { Global, Module } from '@nestjs/common';
import { AIProviderService } from './ai-provider.service';
import { ProvidersController } from './providers.controller';

@Global()
@Module({
  controllers: [ProvidersController],
  providers: [AIProviderService],
  exports: [AIProviderService],
})
export class ProvidersModule {}
