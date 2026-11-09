import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../database/entities';
import { ModelFactoryService } from './model-factory.service';

@Controller('model-factory')
export class ModelFactoryController {
  constructor(private readonly modelFactory: ModelFactoryService) {}

  @Get('status')
  getModelFactoryStatus() {
    return {
      status: 'planned',
      current_phase:
        'Phase 1: Autonomous AI Engineer & External Provider Integration (Active)',
      roadmap: [
        {
          phase: 'Phase 2',
          title: 'Dataset & Corpus Management',
          status: 'active',
          capabilities: [
            'Curated code corpus ingest & deduplication',
            'Synthesized instruction-response pair generation',
            'Automated AST-level dataset validation',
            'Git history commit-to-diff training pair extraction',
          ],
          target_entities: ['Dataset', 'DatasetVersion', 'DataSample'],
        },
        {
          phase: 'Phase 3',
          title: 'Autonomous Fine-Tuning Infrastructure',
          status: 'active',
          capabilities: [
            'LoRA and QLoRA parameter-efficient adaptation',
            'Multi-GPU distributed training coordinator',
            'Continuous loss tracking and benchmark evaluation',
            'Automated checkpoint deployment',
          ],
          target_entities: ['TrainingJob', 'EvaluationReport', 'ModelCheckpoint'],
        },
        {
          phase: 'Phase 4',
          title: 'Proprietary Model Serving & Hybrid Routing',
          status: 'active',
          capabilities: [
            'Self-hosted vLLM dedicated inference endpoints',
            'Dynamic hybrid routing between external APIs and fine-tuned weights',
            'Zero-downtime model hot-swapping',
          ],
          target_entities: ['ModelDeployment', 'InferenceEndpoint'],
        },
      ],
    };
  }

  @Get('overview')
  @UseGuards(AuthGuard)
  getOverview(@Query('project_id') projectId?: string) {
    return this.modelFactory.getOverview(projectId);
  }

  // --- Datasets ---

  @Get('datasets')
  @UseGuards(AuthGuard)
  listDatasets(@Query('project_id') projectId?: string) {
    return this.modelFactory.listDatasets(projectId);
  }

  @Get('datasets/:id')
  @UseGuards(AuthGuard)
  getDataset(@Param('id') id: string) {
    return this.modelFactory.getDataset(id);
  }

  @Post('datasets')
  @UseGuards(AuthGuard)
  createDataset(
    @Body()
    body: {
      project_id?: string;
      name: string;
      description?: string;
      format?: 'alpaca' | 'sharegpt' | 'jsonl';
      source?: 'repo_commits' | 'ast_extraction' | 'synthetic' | 'uploaded';
      samples?: any[];
    },
  ) {
    return this.modelFactory.createDataset(body);
  }

  @Post('datasets/extract-from-repo')
  @UseGuards(AuthGuard)
  extractFromRepo(
    @Body() body: { project_id?: string; name?: string; description?: string },
  ) {
    return this.modelFactory.extractDatasetFromRepo(body);
  }

  @Delete('datasets/:id')
  @UseGuards(AuthGuard)
  deleteDataset(@Param('id') id: string) {
    return { success: this.modelFactory.deleteDataset(id) };
  }

  // --- Training Jobs ---

  @Get('jobs')
  @UseGuards(AuthGuard)
  listJobs(@Query('project_id') projectId?: string) {
    return this.modelFactory.listJobs(projectId);
  }

  @Get('jobs/:id')
  @UseGuards(AuthGuard)
  getJob(@Param('id') id: string) {
    return this.modelFactory.getJob(id);
  }

  @Post('jobs')
  @UseGuards(AuthGuard)
  createJob(
    @Body()
    body: {
      project_id?: string;
      dataset_id: string;
      name?: string;
      base_model?: string;
      fine_tuning_method?: 'qlora' | 'lora' | 'full_sft' | 'dpo';
      epochs?: number;
      learning_rate?: number;
      batch_size?: number;
      lora_r?: number;
      lora_alpha?: number;
      target_modules?: string[];
    },
  ) {
    return this.modelFactory.createJob(body);
  }

  @Post('jobs/:id/cancel')
  @UseGuards(AuthGuard)
  cancelJob(@Param('id') id: string) {
    return this.modelFactory.cancelJob(id);
  }

  @Post('jobs/:id/deploy')
  @UseGuards(AuthGuard)
  deployJobCheckpoint(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.modelFactory.deployCheckpoint(id, user);
  }

  @Get('jobs/:id/export-script')
  @UseGuards(AuthGuard)
  getExportScript(@Param('id') id: string) {
    const script = this.modelFactory.generateExportScript(id);
    return { script, filename: `train_${id.slice(0, 8)}.py` };
  }

  // --- Models & Checkpoints ---

  @Get('models')
  @UseGuards(AuthGuard)
  listModels(@Query('project_id') projectId?: string) {
    return this.modelFactory.listCheckpoints(projectId);
  }

  @Post('models/:id/deploy')
  @UseGuards(AuthGuard)
  deployModel(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.modelFactory.deployCheckpoint(id, user);
  }
}
