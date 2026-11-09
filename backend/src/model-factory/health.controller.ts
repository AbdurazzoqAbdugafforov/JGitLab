import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '../core/config.service';

@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: this.config.PROJECT_NAME,
      version: this.config.VERSION,
    };
  }
}
