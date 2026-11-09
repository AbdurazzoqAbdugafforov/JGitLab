import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import { UserEntity } from '../database/entities';
import { AIProviderService } from '../providers/ai-provider.service';
import { MemoryService } from './memory.service';

@Controller('memory')
@UseGuards(AuthGuard)
export class MemoryController {
  constructor(
    private readonly db: DatabaseService,
    private readonly memoryService: MemoryService,
    private readonly aiProviderService: AIProviderService,
  ) {}

  @Get()
  listMemories(
    @Query('project_id') projectId: string,
    @Query('category') category: string | undefined,
    @CurrentUser() user: UserEntity,
  ) {
    if (!projectId) {
      throw new BadRequestException('project_id query parameter is required');
    }
    this.db.verifyProjectAccess(projectId, user);
    return this.db.store.memory_records
      .filter(
        (m) =>
          m.project_id === projectId && (!category || m.category === category),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  @Post()
  @HttpCode(201)
  async createMemory(
    @Body()
    body: {
      project_id?: string;
      category?: string;
      title?: string;
      content?: string;
      summary?: string;
      tags?: string[];
      source_task_id?: string;
    },
    @CurrentUser() user: UserEntity,
  ) {
    if (!body.project_id || !body.category || !body.title || !body.content) {
      throw new BadRequestException(
        'project_id, category, title, and content are required.',
      );
    }
    this.db.verifyProjectAccess(body.project_id, user);

    let provider = null;
    try {
      provider = this.aiProviderService.getProviderForProject(
        body.project_id,
        user.id,
      );
    } catch {
      provider = null;
    }

    const record = await this.memoryService.addMemory(
      {
        projectId: body.project_id,
        category: body.category,
        title: body.title,
        content: body.content,
        summary: body.summary,
        tags: body.tags,
        sourceTaskId: body.source_task_id,
      },
      provider,
    );

    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: body.project_id,
      user_id: user.id,
      action_type: 'memory_added',
      entity_type: 'memory',
      entity_id: record.id,
      description: `Added [${record.category}] memory: '${record.title}'.`,
      metadata_json: null,
      ip_address: null,
      created_at: utcNow(),
    });
    this.db.save();

    return record;
  }

  @Post('search')
  @HttpCode(200)
  async searchMemories(
    @Body()
    body: {
      project_id?: string;
      query?: string;
      category?: string;
      limit?: number;
    },
    @CurrentUser() user: UserEntity,
  ) {
    if (!body.project_id) {
      throw new BadRequestException('project_id is required.');
    }
    this.db.verifyProjectAccess(body.project_id, user);

    let provider = null;
    try {
      provider = this.aiProviderService.getProviderForProject(
        body.project_id,
        user.id,
      );
    } catch {
      provider = null;
    }

    return this.memoryService.searchMemories(
      {
        projectId: body.project_id,
        query: body.query || '',
        category: body.category,
        limit: body.limit ?? 5,
      },
      provider,
    );
  }

  @Get(':memoryId')
  getMemory(
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const record = this.db.store.memory_records.find((m) => m.id === memoryId);
    if (!record) {
      throw new NotFoundException('Memory record not found');
    }
    this.db.verifyProjectAccess(record.project_id, user);
    return record;
  }

  @Delete(':memoryId')
  deleteMemory(
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const record = this.db.store.memory_records.find((m) => m.id === memoryId);
    if (!record) {
      throw new NotFoundException('Memory record not found');
    }
    this.db.verifyProjectAccess(record.project_id, user);
    this.db.store.memory_records = this.db.store.memory_records.filter(
      (m) => m.id !== memoryId,
    );
    this.db.save();
    return { message: 'Memory record deleted successfully.' };
  }
}
