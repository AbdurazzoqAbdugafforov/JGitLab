import { Module } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

@Module({
  controllers: [AgentController],
  providers: [SandboxService, AgentService],
  exports: [SandboxService, AgentService],
})
export class AgentModule {}
