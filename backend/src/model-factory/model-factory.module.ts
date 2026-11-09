import { Module } from '@nestjs/common';
import { ModelFactoryController } from './model-factory.controller';
import { HealthController } from './health.controller';
import { ModelFactoryService } from './model-factory.service';

@Module({
  controllers: [ModelFactoryController, HealthController],
  providers: [ModelFactoryService],
  exports: [ModelFactoryService],
})
export class ModelFactoryModule {}
