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
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import {
  AIProviderConfigurationEntity,
  UserEntity,
} from '../database/entities';
import {
  AIProviderError,
  LocalMVPProvider,
  OpenAICompatibleProvider,
  GoogleGeminiProvider,
  AnthropicClaudeProvider,
} from './ai-provider.service';

@Controller('providers')
@UseGuards(AuthGuard)
export class ProvidersController {
  constructor(
    private readonly db: DatabaseService,
    private readonly security: SecurityService,
    private readonly config: ConfigService,
  ) {}

  private toResponse(config: AIProviderConfigurationEntity) {
    const rawKey = this.security.decryptSecret(config.api_key_enc);
    const masked = this.security.maskSecret(rawKey);
    return {
      id: config.id,
      project_id: config.project_id,
      provider_name: config.provider_name,
      base_url: config.base_url,
      api_key_masked: masked,
      model_name: config.model_name,
      embedding_model_name: config.embedding_model_name,
      temperature: config.temperature,
      max_output_tokens: config.max_output_tokens,
      timeout_seconds: config.timeout_seconds,
      max_retries: config.max_retries,
      is_active: config.is_active,
      validation_status: config.validation_status,
      validation_message: config.validation_message,
      last_validated_at: config.last_validated_at,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };
  }

  @Get()
  listProviders(
    @Query('project_id') projectId: string | undefined,
    @CurrentUser() user: UserEntity,
  ) {
    if (projectId) {
      this.db.verifyProjectAccess(projectId, user);
    }
    return this.db.store.ai_provider_configurations
      .filter(
        (c) =>
          (c.user_id === user.id ||
            (projectId && c.project_id === projectId)) &&
          (!projectId || c.project_id === projectId),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => this.toResponse(c));
  }

  @Post()
  @HttpCode(201)
  createOrUpdateProvider(
    @Body()
    body: {
      project_id?: string | null;
      provider_name?: string;
      base_url?: string;
      api_key?: string;
      model_name?: string;
      embedding_model_name?: string | null;
      temperature?: number;
      max_output_tokens?: number;
      timeout_seconds?: number;
      max_retries?: number;
    },
    @CurrentUser() user: UserEntity,
  ) {
    if (body.project_id) {
      this.db.verifyProjectAccess(body.project_id, user);
    }
    if (!body.api_key || !body.base_url || !body.model_name) {
      throw new BadRequestException(
        'provider_name, base_url, api_key, and model_name are required.',
      );
    }

    const encryptedKey = this.security.encryptSecret(body.api_key);
    if (body.project_id) {
      for (const prev of this.db.store.ai_provider_configurations) {
        if (prev.project_id === body.project_id && prev.user_id === user.id) {
          prev.is_active = false;
        }
      }
    }

    const now = utcNow();
    const isLocal = body.base_url.startsWith('local://');
    const config: AIProviderConfigurationEntity = {
      id: genUuid(),
      project_id: body.project_id ?? null,
      user_id: user.id,
      provider_name: body.provider_name || 'openai-compatible',
      base_url: body.base_url,
      api_key_enc: encryptedKey,
      model_name: body.model_name,
      embedding_model_name:
        body.embedding_model_name ?? 'text-embedding-3-small',
      temperature: body.temperature ?? 0.2,
      max_output_tokens: body.max_output_tokens ?? 4096,
      timeout_seconds: body.timeout_seconds ?? 60,
      max_retries: body.max_retries ?? 3,
      is_active: true,
      last_validated_at: isLocal ? now : null,
      validation_status: isLocal ? 'success' : 'untested',
      validation_message: isLocal
        ? `Connected to JGitLab Built-in Autonomous Engine (${body.model_name}).`
        : null,
      created_at: now,
      updated_at: now,
    };

    this.db.store.ai_provider_configurations.push(config);
    this.db.store.activity_logs.push({
      id: genUuid(),
      project_id: config.project_id,
      user_id: user.id,
      action_type: 'provider_configured',
      entity_type: 'provider',
      entity_id: config.id,
      description: `AI Provider '${config.provider_name}' configured for model '${config.model_name}'.`,
      metadata_json: null,
      ip_address: null,
      created_at: now,
    });
    this.db.save();

    return this.toResponse(config);
  }

  @Post('validate')
  @HttpCode(200)
  async validateProvider(
    @Body()
    body: {
      config_id?: string;
      base_url?: string;
      api_key?: string;
      model_name?: string;
    },
    @CurrentUser() user: UserEntity,
  ) {
    let baseUrl = body.base_url;
    let apiKey = body.api_key;
    let modelName =
      body.model_name ||
      (body as any).default_model ||
      (baseUrl?.includes('mwapi') || baseUrl?.includes('anthropic')
        ? 'claude-haiku-4-5-20251001'
        : 'gpt-4o');
    let configObj: AIProviderConfigurationEntity | undefined;

    if (body.config_id) {
      configObj = this.db.store.ai_provider_configurations.find(
        (c) => c.id === body.config_id && c.user_id === user.id,
      );
      if (configObj) {
        baseUrl = baseUrl || configObj.base_url;
        modelName = body.model_name || configObj.model_name;
        if (!apiKey) {
          apiKey = this.security.decryptSecret(configObj.api_key_enc);
        }
      }
    }

    if (!baseUrl) {
      throw new BadRequestException(
        'Missing Base URL for connection test.',
      );
    }

    const provider = baseUrl.startsWith('local://')
      ? (() => {
          if (!this.config.isTest) {
            throw new BadRequestException(
              'Local demo provider is disabled. Please connect to a real AI provider (OpenAI, Gemini, Groq, Ollama, DeepSeek, OpenRouter).',
            );
          }
          return new LocalMVPProvider(modelName);
        })()
      : (() => {
          if (!apiKey) {
            throw new BadRequestException(
              'Missing API Key or Base URL for connection test.',
            );
          }
          if (
            baseUrl.includes('anthropic') ||
            baseUrl.includes('mwapi') ||
            modelName.startsWith('claude-') ||
            apiKey.startsWith('sk-ant-') ||
            (apiKey.startsWith('sk-') && apiKey.length >= 60)
          ) {
            return new AnthropicClaudeProvider({
              apiKey,
              baseUrl,
              modelName,
              timeoutSeconds: 15,
            });
          }
          if (
            baseUrl.includes('generativelanguage.googleapis.com') ||
            modelName.startsWith('gemini-') ||
            apiKey.startsWith('AIzaSy') ||
            apiKey.startsWith('AQ.')
          ) {
            return new GoogleGeminiProvider({
              apiKey,
              modelName,
              timeoutSeconds: 15,
            });
          }
          return new OpenAICompatibleProvider({
            apiKey,
            baseUrl,
            modelName,
            timeoutSeconds: 15,
          });
        })();

    try {
      const valResult = await provider.validateConnection();
      if (configObj) {
        configObj.validation_status = 'success';
        configObj.validation_message = valResult.message;
        configObj.last_validated_at = utcNow();
        configObj.updated_at = utcNow();
        this.db.save();
      }
      return {
        success: true,
        latency_ms: valResult.latency_ms,
        message: valResult.message,
        models_available: valResult.available_models,
      };
    } catch (err) {
      const msg =
        err instanceof AIProviderError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      if (configObj) {
        configObj.validation_status = 'error';
        configObj.validation_message = msg;
        configObj.last_validated_at = utcNow();
        configObj.updated_at = utcNow();
        this.db.save();
      }
      return {
        success: false,
        latency_ms: 0,
        message: `Validation failed: ${msg}`,
        models_available: [],
      };
    }
  }

  @Delete(':configId')
  deleteProvider(
    @Param('configId') configId: string,
    @CurrentUser() user: UserEntity,
  ) {
    const config = this.db.store.ai_provider_configurations.find(
      (c) => c.id === configId && c.user_id === user.id,
    );
    if (!config) {
      throw new NotFoundException('Provider configuration not found');
    }
    this.db.store.ai_provider_configurations =
      this.db.store.ai_provider_configurations.filter((c) => c.id !== configId);
    this.db.save();
    return { message: 'Provider configuration removed.' };
  }
}
