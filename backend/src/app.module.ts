import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { SecurityMiddleware } from './core/security.middleware';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { GitHubModule } from './github/github.module';
import { ProvidersModule } from './providers/providers.module';
import { MemoryModule } from './memory/memory.module';
import { AgentModule } from './agent/agent.module';
import { ActivityModule } from './activity/activity.module';
import { ModelFactoryModule } from './model-factory/model-factory.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    AuthModule,
    AdminModule,
    ProjectsModule,
    GitHubModule,
    ProvidersModule,
    MemoryModule,
    AgentModule,
    ActivityModule,
    ModelFactoryModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}
