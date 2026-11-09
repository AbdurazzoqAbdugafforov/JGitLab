import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './core/config.service';
import { AllExceptionsFilter } from './core/http-exception.filter';
import { WebSocketService } from './core/websocket.service';
import { DatabaseService } from './database/database.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const config = app.get(ConfigService);
  const wsService = app.get(WebSocketService);
  const db = app.get(DatabaseService);

  wsService.setDatabaseService(db);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: config.BACKEND_CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  wsService.attachToServer(app.getHttpServer());

  const port = config.PORT || 8000;
  await app.listen(port, '0.0.0.0');
  console.log(
    `[JGitLab NestJS Backend] Listening on http://127.0.0.1:${port} (API prefix: /api/v1)`,
  );
}

void bootstrap();
