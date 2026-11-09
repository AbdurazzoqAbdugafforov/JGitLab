import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '../core/config.service';
import { SecurityService } from '../core/security.service';
import { DatabaseService } from '../database/database.service';
import { AIProviderConfigurationEntity } from '../database/entities';

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AIResponse {
  content: string | null;
  tool_calls: AIToolCall[];
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  finish_reason: string | null;
  model: string;
}

export interface AIValidationResult {
  is_valid: boolean;
  latency_ms: number;
  message: string;
  available_models: string[];
}

export interface AIProvider {
  validateConnection(): Promise<AIValidationResult>;
  generateResponse(
    messages: Array<Record<string, any>>,
    tools?: Array<Record<string, any>>,
    temperature?: number,
    maxTokens?: number,
  ): Promise<AIResponse>;
  generateStructuredResponse(
    messages: Array<Record<string, any>>,
    responseSchema: Record<string, any>,
    temperature?: number,
  ): Promise<Record<string, any>>;
  generateEmbedding(text: string): Promise<number[]>;
}

export class AIProviderError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details: Record<string, any> = {},
  ) {
    super(message);
  }
}

export class LocalMVPProvider implements AIProvider {
  readonly modelName: string;

  constructor(modelName = 'jgitlab-autonomous-v1') {
    this.modelName = modelName || 'jgitlab-autonomous-v1';
  }

  private extractTaskContext(text: string) {
    const titleMatch = text.match(/Title:\s*(.+)/);
    const descMatch = text.match(/Description:\s*(.+)/);
    const title = titleMatch
      ? titleMatch[1].trim()
      : 'Autonomous Engineering Enhancement';
    const description = descMatch
      ? descMatch[1].trim()
      : 'Implement requested module with verification tests.';
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 36) || 'feature_module';
    return { title, description, slug };
  }

  async validateConnection(): Promise<AIValidationResult> {
    return {
      is_valid: true,
      latency_ms: 12,
      message: `Connected to JGitLab Built-in Autonomous Engine (${this.modelName}). Ready for sandbox planning & execution.`,
      available_models: [
        'jgitlab-autonomous-v1',
        'jgitlab-architect-pro',
        'jgitlab-fast-coder',
      ],
    };
  }

  async generateStructuredResponse(
    messages: Array<Record<string, any>>,
    _responseSchema: Record<string, any>,
    _temperature?: number,
  ): Promise<Record<string, any>> {
    const combined = messages
      .map((m) => String(m.content || ''))
      .filter(Boolean)
      .join('\n');
    const ctx = this.extractTaskContext(combined);
    const { slug, title } = ctx;

    return {
      task_summary: `Architect and implement '${title}' inside an isolated Git workspace with modular implementation (\`src/${slug}.ts\`), automated unit verification (\`tests/${slug}.spec.ts\`), and updated documentation (\`README.md\`).`,
      existing_architecture_analysis:
        'Evaluated repository baseline, existing module boundaries, and Architectural Decision Records (ADRs). The new implementation introduces a self-contained, strictly typed domain module with zero breaking changes.',
      files_to_inspect: ['README.md'],
      files_likely_to_change: [
        {
          path: `src/${slug}.ts`,
          action: 'create',
          reason: `Core typed implementation and validation logic for ${title}.`,
        },
        {
          path: `tests/${slug}.spec.ts`,
          action: 'create',
          reason:
            'Deterministic unit tests covering default and parameterized execution paths.',
        },
        {
          path: 'README.md',
          action: 'edit',
          reason: 'Document module interface and verification instructions.',
        },
      ],
      proposed_implementation_steps: [
        {
          step_number: 1,
          title: 'Inspect workspace topology & repository baseline',
          description:
            'List workspace files and inspect README.md to align with existing conventions.',
          tools: ['list_files', 'read_file'],
        },
        {
          step_number: 2,
          title: `Implement core module for ${title}`,
          description: `Create \`src/${slug}.ts\` with typed implementation, validation guards, and structured telemetry output.`,
          tools: ['create_file'],
        },
        {
          step_number: 3,
          title: 'Add automated unit test suite & verify execution',
          description: `Create \`tests/${slug}.spec.ts\`, update \`README.md\`, and run verification in the sandbox.`,
          tools: ['create_file', 'run_build'],
        },
      ],
      potential_risks: [
        'Ensure backward compatibility with existing workspace entrypoints',
        'Verify deterministic unit test execution inside sandbox runner',
      ],
      dependencies: ['Node.js Runtime', 'TypeScript'],
      testing_strategy: `Execute automated assertions against \`src/${slug}.ts\` and \`tests/${slug}.spec.ts\`.`,
    };
  }

  async generateResponse(
    messages: Array<Record<string, any>>,
    tools?: Array<Record<string, any>>,
  ): Promise<AIResponse> {
    const userText = messages
      .filter((m) => m.role === 'user' && m.content)
      .map((m) => String(m.content))
      .join('\n');
    const ctx = this.extractTaskContext(userText);
    const { slug, title, description } = ctx;

    const toolMessages = messages.filter((m) => m.role === 'tool');
    const numToolMsgs = toolMessages.length;

    if (tools && tools.length > 0) {
      if (numToolMsgs === 0) {
        return {
          content:
            'Inspecting repository structure and reading baseline documentation before applying changes.',
          model: this.modelName,
          finish_reason: 'tool_calls',
          tool_calls: [
            {
              id: 'call_inspect_1',
              name: 'list_files',
              arguments: { path: '.' },
            },
            {
              id: 'call_inspect_2',
              name: 'read_file',
              arguments: { path: 'README.md' },
            },
          ],
          prompt_tokens: 320,
          completion_tokens: 85,
          total_tokens: 405,
          latency_ms: 38,
        };
      }

      if (numToolMsgs <= 2) {
        const moduleCode =
          `/**\n` +
          ` * Autonomous implementation for: ${title}\n` +
          ` * Specification: ${description}\n` +
          ` */\n\n` +
          `export interface ExecutionReport {\n` +
          `  module: string;\n` +
          `  status: 'verified' | 'failed';\n` +
          `  checksPassed: number;\n` +
          `  metadata: Record<string, unknown>;\n` +
          `}\n\n` +
          `export function execute_${slug}(payload: Record<string, unknown> = {}): ExecutionReport {\n` +
          `  const keys = Object.keys(payload);\n` +
          `  return {\n` +
          `    module: ${JSON.stringify(slug)},\n` +
          `    status: 'verified',\n` +
          `    checksPassed: Math.max(1, keys.length + 1),\n` +
          `    metadata: { title: ${JSON.stringify(title)}, keys },\n` +
          `  };\n` +
          `}\n`;

        const testCode =
          `import { execute_${slug} } from '../src/${slug}';\n\n` +
          `export function verify_${slug}(): boolean {\n` +
          `  const report = execute_${slug}({ env: 'mvp', strict: true });\n` +
          `  if (report.status !== 'verified') throw new Error('Verification failed');\n` +
          `  if (report.checksPassed < 2) throw new Error('Expected checksPassed >= 2');\n` +
          `  return true;\n` +
          `}\n`;

        const readmeContent =
          `# ${title}\n\n` +
          `Managed by **JGitLab Autonomous AI Software Engineer**.\n\n` +
          `## Task Specification\n` +
          `${description}\n\n` +
          `## Delivered Artifacts\n` +
          `- \`src/${slug}.ts\` — Core typed module and validation logic\n` +
          `- \`tests/${slug}.spec.ts\` — Automated unit test suite\n`;

        return {
          content: `Creating modular implementation \`src/${slug}.ts\`, unit test suite \`tests/${slug}.spec.ts\`, and updating \`README.md\`.`,
          model: this.modelName,
          finish_reason: 'tool_calls',
          tool_calls: [
            {
              id: 'call_create_mod',
              name: 'create_file',
              arguments: {
                path: `src/${slug}.ts`,
                content: moduleCode,
              },
            },
            {
              id: 'call_create_test',
              name: 'create_file',
              arguments: {
                path: `tests/${slug}.spec.ts`,
                content: testCode,
              },
            },
            {
              id: 'call_update_readme',
              name: 'create_file',
              arguments: {
                path: 'README.md',
                content: readmeContent,
              },
            },
          ],
          prompt_tokens: 540,
          completion_tokens: 290,
          total_tokens: 830,
          latency_ms: 52,
        };
      }

      if (numToolMsgs <= 5) {
        return {
          content:
            'Running verification on the generated module and test suite.',
          model: this.modelName,
          finish_reason: 'tool_calls',
          tool_calls: [
            {
              id: 'call_verify_build',
              name: 'run_build',
              arguments: {
                command: `node -e "const fs = require('fs'); if (!fs.existsSync('src/${slug}.ts')) process.exit(1); console.log('Verified src/${slug}.ts and tests/${slug}.spec.ts');"`,
              },
            },
          ],
          prompt_tokens: 710,
          completion_tokens: 65,
          total_tokens: 775,
          latency_ms: 29,
        };
      }
    }

    return {
      content:
        `Completed implementation and verification for **${title}**.\n\n` +
        `- Created \`src/${slug}.ts\` with typed \`ExecutionReport\` and \`execute_${slug}()\` entrypoint.\n` +
        `- Added unit tests in \`tests/${slug}.spec.ts\`.\n` +
        `- Updated \`README.md\` and verified artifacts cleanly inside the sandbox.`,
      model: this.modelName,
      finish_reason: 'stop',
      tool_calls: [],
      prompt_tokens: 820,
      completion_tokens: 110,
      total_tokens: 930,
      latency_ms: 24,
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const digest = crypto.createHash('sha256').update(text, 'utf8').digest();
    const vec: number[] = [];
    for (let i = 0; i < 64; i++) {
      vec.push((digest[i % digest.length] / 255.0) * 2.0 - 1.0);
    }
    return vec;
  }
}

export class GoogleGeminiProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly timeoutSeconds: number;

  constructor(options: {
    apiKey: string;
    modelName?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutSeconds?: number;
  }) {
    this.apiKey = (options.apiKey || '').trim();
    let model = (options.modelName || 'gemini-2.5-flash').trim();
    if (model === 'gemini-1.5-flash' || model === 'gemini-1.5-pro') {
      model = 'gemini-2.5-flash';
    }
    this.modelName = model;
    this.temperature = options.temperature ?? 0.2;
    this.maxOutputTokens = options.maxOutputTokens ?? 4096;
    this.timeoutSeconds = options.timeoutSeconds ?? 60;
  }

  async validateConnection(): Promise<AIValidationResult> {
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
    try {
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(Math.min(15, this.timeoutSeconds) * 1000),
      });
      const latencyMs = Date.now() - start;
      if (resp.ok) {
        const data: any = await resp.json();
        const models = (data.models || []).map((m: any) =>
          (m.name || '').replace(/^models\//, ''),
        );
        return {
          is_valid: true,
          latency_ms: latencyMs,
          message: `Successfully connected to Google Gemini. ${models.length} models available.`,
          available_models: models,
        };
      }
      const errText = await resp.text();
      throw new AIProviderError(`Gemini validation error: ${errText}`, resp.status);
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(`Network error connecting to Gemini: ${err.message}`);
    }
  }

  async generateResponse(
    messages: Array<Record<string, any>>,
    _tools?: Array<Record<string, any>>,
    temperature?: number,
    maxTokens?: number,
  ): Promise<AIResponse> {
    const start = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    let systemText = '';
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      const role = String(msg.role || '').toLowerCase();
      const text = String(msg.content || '');
      if (!text) continue;

      if (role === 'system') {
        systemText = systemText ? `${systemText}\n\n${text}` : text;
      } else if (role === 'assistant' || role === 'model') {
        contents.push({ role: 'model', parts: [{ text }] });
      } else {
        contents.push({ role: 'user', parts: [{ text }] });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const payload: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: temperature ?? this.temperature,
        maxOutputTokens: maxTokens ?? this.maxOutputTokens,
      },
    };

    if (systemText) {
      payload.systemInstruction = {
        parts: [{ text: systemText }],
      };
    }

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutSeconds * 1000),
      });

      const latencyMs = Date.now() - start;

      if (!resp.ok) {
        const errText = await resp.text();
        throw new AIProviderError(
          `Google Gemini API error (${resp.status}): ${errText}`,
          resp.status,
        );
      }

      const data: any = await resp.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || '';
      const usage = data.usageMetadata || {};

      return {
        content: text,
        model: this.modelName,
        finish_reason: candidate?.finishReason || 'stop',
        tool_calls: [],
        prompt_tokens: usage.promptTokenCount || 0,
        completion_tokens: usage.candidatesTokenCount || 0,
        total_tokens: usage.totalTokenCount || 0,
        latency_ms: latencyMs,
      };
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        `Gemini execution failure: ${err.message}`,
        500,
      );
    }
  }

  async generateStructuredResponse(
    messages: Array<Record<string, any>>,
    _responseSchema: Record<string, any>,
    temperature?: number,
  ): Promise<Record<string, any>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    let systemText = 'You must respond with valid JSON matching the requested structure.';
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      const role = String(msg.role || '').toLowerCase();
      const text = String(msg.content || '');
      if (role === 'system') {
        systemText = `${systemText}\n\n${text}`;
      } else if (role === 'assistant' || role === 'model') {
        contents.push({ role: 'model', parts: [{ text }] });
      } else {
        contents.push({ role: 'user', parts: [{ text }] });
      }
    }

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemText }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: temperature ?? 0.1,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutSeconds * 1000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new AIProviderError(`Gemini structured response error: ${errText}`, resp.status);
      }

      const data: any = await resp.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      try {
        return JSON.parse(raw);
      } catch {
        return { raw_content: raw };
      }
    } catch (err: any) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(`Gemini structured response error: ${err.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const digest = crypto.createHash('sha256').update(text, 'utf8').digest();
    const vec: number[] = [];
    for (let i = 0; i < 64; i++) {
      vec.push((digest[i % digest.length] / 255.0) * 2.0 - 1.0);
    }
    return vec;
  }
}

export class AnthropicClaudeProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly timeoutSeconds: number;

  constructor(options: {
    apiKey: string;
    baseUrl?: string;
    modelName?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutSeconds?: number;
  }) {
    this.apiKey = (options.apiKey || '').trim();
    let base = (
      options.baseUrl ||
      process.env.ANTHROPIC_BASE_URL ||
      'https://api.mwapi.dev'
    )
      .trim()
      .replace(/\/+$/, '');
    if (!base.endsWith('/v1')) {
      base = `${base}/v1`;
    }
    this.baseUrl = base;

    let model = (
      options.modelName ||
      process.env.ANTHROPIC_MODEL_NAME ||
      'claude-haiku-4-5-20251001'
    ).trim();
    if (model === 'claude-3-5-haiku-20241022' || model === 'claude-haiku') {
      model = 'claude-haiku-4-5-20251001';
    } else if (
      model === 'claude-3-5-sonnet-20241022' ||
      model === 'claude-sonnet'
    ) {
      model = 'claude-sonnet-5';
    }
    this.modelName = model;
    this.temperature = options.temperature ?? 0.1;
    this.maxOutputTokens = options.maxOutputTokens ?? 2048;
    this.timeoutSeconds = options.timeoutSeconds ?? 60;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'claude-code-20250219',
      'content-type': 'application/json',
    };
  }

  async validateConnection(): Promise<AIValidationResult> {
    const startMs = Date.now();
    try {
      const resp = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: 16,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        return {
          is_valid: true,
          latency_ms: Date.now() - startMs,
          message: `Connected to Claude API via ${this.baseUrl} (${this.modelName}). Ready for autonomous engineering.`,
          available_models: [
            'claude-haiku-4-5-20251001',
            'claude-sonnet-5',
            'claude-opus-5',
          ],
        };
      }

      const errText = await resp.text();
      return {
        is_valid: false,
        latency_ms: Date.now() - startMs,
        message: `Anthropic validation failed (${resp.status}): ${errText.slice(0, 150)}`,
        available_models: [],
      };
    } catch (err: any) {
      return {
        is_valid: false,
        latency_ms: Date.now() - startMs,
        message: `Network error connecting to Anthropic API: ${err.message}`,
        available_models: [],
      };
    }
  }

  async generateResponse(
    messages: Array<Record<string, any>>,
    tools?: Array<Record<string, any>>,
    temperature?: number,
    maxTokens?: number,
  ): Promise<AIResponse> {
    const start = Date.now();

    // 1. Separate system messages from conversation messages
    const systemParts = messages
      .filter((m) => m.role === 'system')
      .map((m) => String(m.content || ''))
      .filter(Boolean)
      .join('\n\n');

    const nonSystem = messages.filter((m) => m.role !== 'system');
    const rawTurnList: Array<{ role: 'user' | 'assistant'; content: any }> = [];

    // 2. Convert OpenAI-style turns to Anthropic content blocks
    for (let i = 0; i < nonSystem.length; i++) {
      const msg = nonSystem[i];
      const role = String(msg.role || '').toLowerCase();

      if (role === 'assistant') {
        const blocks: any[] = [];
        if (msg.content) {
          blocks.push({ type: 'text', text: String(msg.content) });
        }
        if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          for (const tc of msg.tool_calls) {
            const fnName = tc.name || tc.function?.name;
            let args = tc.arguments ?? tc.function?.arguments ?? {};
            if (typeof args === 'string') {
              try {
                args = JSON.parse(args);
              } catch {
                args = { raw: args };
              }
            }
            blocks.push({
              type: 'tool_use',
              id: tc.id || `tooluse_${Math.random().toString(36).slice(2, 10)}`,
              name: fnName,
              input: args || {},
            });
          }
        }
        if (blocks.length === 0) {
          blocks.push({ type: 'text', text: ' ' });
        }
        rawTurnList.push({ role: 'assistant', content: blocks });
      } else if (role === 'tool') {
        // Collect consecutive tool results into one user turn
        const toolResultBlocks: any[] = [];
        let j = i;
        while (j < nonSystem.length && nonSystem[j].role === 'tool') {
          const tMsg = nonSystem[j];
          let contentStr = '';
          if (typeof tMsg.content === 'string') {
            contentStr = tMsg.content;
          } else {
            contentStr = JSON.stringify(tMsg.content ?? {});
          }
          // Cap content size to minimize token overhead
          if (contentStr.length > 4000) {
            contentStr = `${contentStr.slice(0, 3900)}\n... [truncated to save tokens]`;
          }
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: tMsg.tool_call_id || tMsg.id,
            content: contentStr,
          });
          j++;
        }
        i = j - 1;
        rawTurnList.push({ role: 'user', content: toolResultBlocks });
      } else {
        const userText = String(msg.content || '');
        rawTurnList.push({
          role: 'user',
          content: [{ type: 'text', text: userText || 'Proceed' }],
        });
      }
    }

    // 3. Guarantee strict turn alternation for Anthropic API
    const mergedTurns: Array<{ role: 'user' | 'assistant'; content: any }> = [];
    for (const turn of rawTurnList) {
      const prev = mergedTurns[mergedTurns.length - 1];
      if (prev && prev.role === turn.role) {
        const prevBlocks = Array.isArray(prev.content)
          ? prev.content
          : [{ type: 'text', text: String(prev.content) }];
        const curBlocks = Array.isArray(turn.content)
          ? turn.content
          : [{ type: 'text', text: String(turn.content) }];
        prev.content = [...prevBlocks, ...curBlocks];
      } else {
        mergedTurns.push({ ...turn });
      }
    }

    if (mergedTurns.length === 0) {
      mergedTurns.push({
        role: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      });
    }

    // 4. Map tool definitions to Anthropic format
    const anthropicTools =
      tools && tools.length > 0
        ? tools.map((t) => {
            const fn = t.function || t;
            return {
              name: fn.name,
              description: fn.description || '',
              input_schema:
                fn.parameters ||
                fn.input_schema || { type: 'object', properties: {} },
            };
          })
        : undefined;

    const payload: any = {
      model: this.modelName,
      max_tokens: maxTokens ?? this.maxOutputTokens,
      temperature: temperature ?? this.temperature,
      messages: mergedTurns,
    };
    if (systemParts) {
      payload.system = systemParts;
    }
    if (anthropicTools && anthropicTools.length > 0) {
      payload.tools = anthropicTools;
    }

    const resp = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutSeconds * 1000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new AIProviderError(
        `Anthropic error (${resp.status}): ${errText}`,
        resp.status,
      );
    }

    const data: any = await resp.json();
    const contentBlocks: any[] = Array.isArray(data.content)
      ? data.content
      : [];
    const textPieces: string[] = [];
    const toolCalls: AIToolCall[] = [];

    for (const b of contentBlocks) {
      if (b.type === 'text' && b.text) {
        textPieces.push(b.text);
      } else if (b.type === 'tool_use') {
        toolCalls.push({
          id: b.id,
          name: b.name,
          arguments: b.input || {},
        });
      }
    }

    const usage = data.usage || {};
    const inputTokens =
      (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0);
    const outputTokens = usage.output_tokens || 0;

    return {
      content: textPieces.join('\n').trim() || null,
      tool_calls: toolCalls,
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      latency_ms: Date.now() - start,
      finish_reason:
        data.stop_reason || (toolCalls.length > 0 ? 'tool_calls' : 'stop'),
      model: data.model || this.modelName,
    };
  }

  async generateStructuredResponse(
    messages: Array<Record<string, any>>,
    responseSchema: Record<string, any>,
    temperature?: number,
  ): Promise<Record<string, any>> {
    // High-speed, guaranteed-schema via tool calling
    const schemaTool = {
      name: 'submit_structured_output',
      description:
        'Submit the structured output plan strictly adhering to the schema.',
      input_schema: responseSchema,
    };

    try {
      const systemParts = messages
        .filter((m) => m.role === 'system')
        .map((m) => String(m.content || ''))
        .join('\n\n');
      const userParts = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: String(m.content || ''),
        }));

      const payload: any = {
        model: this.modelName,
        max_tokens: 3000,
        temperature: temperature ?? 0.1,
        messages:
          userParts.length > 0
            ? userParts
            : [{ role: 'user', content: 'Generate structured plan' }],
        tools: [schemaTool],
        tool_choice: { type: 'tool', name: 'submit_structured_output' },
      };
      if (systemParts) {
        payload.system = systemParts;
      }

      const resp = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutSeconds * 1000),
      });

      if (resp.ok) {
        const data: any = await resp.json();
        const toolBlock = (data.content || []).find(
          (b: any) =>
            b.type === 'tool_use' && b.name === 'submit_structured_output',
        );
        if (toolBlock && toolBlock.input && typeof toolBlock.input === 'object') {
          return toolBlock.input;
        }
      }
    } catch {
      // Fall through to text-based JSON fallback
    }

    // Fallback: prompt for pure JSON and parse
    const promptWithJson = [
      ...messages,
      {
        role: 'user',
        content: `Respond ONLY with a single valid JSON object strictly matching this schema without commentary or markdown code blocks:\n${JSON.stringify(responseSchema, null, 2)}`,
      },
    ];
    const res = await this.generateResponse(
      promptWithJson,
      undefined,
      temperature ?? 0.1,
      3000,
    );
    let cleaned = (res.content || '{}').trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      }
      return { raw_content: res.content };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const digest = crypto.createHash('sha256').update(text, 'utf8').digest();
    const vec: number[] = [];
    for (let i = 0; i < 64; i++) {
      vec.push((digest[i % digest.length] / 255.0) * 2.0 - 1.0);
    }
    return vec;
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly embeddingModelName: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly timeoutSeconds: number;

  constructor(options: {
    apiKey: string;
    baseUrl?: string;
    modelName?: string;
    embeddingModelName?: string | null;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutSeconds?: number;
  }) {
    this.apiKey = (options.apiKey || '').trim();
    this.baseUrl = (options.baseUrl || 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    );
    this.modelName = (options.modelName || 'gpt-4o').trim();
    this.embeddingModelName = (
      options.embeddingModelName || 'text-embedding-3-small'
    ).trim();
    this.temperature = options.temperature ?? 0.2;
    this.maxOutputTokens = options.maxOutputTokens ?? 4096;
    this.timeoutSeconds = options.timeoutSeconds ?? 60;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JGitLab-AI-Engine/0.2.0',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private handleErrorResponse(statusCode: number, responseText: string): never {
    let errorMsg = `HTTP ${statusCode}`;
    let details: Record<string, any> = {};
    try {
      const data = JSON.parse(responseText);
      if (data.error) {
        if (typeof data.error === 'object') {
          errorMsg = data.error.message || errorMsg;
          details = data.error;
        } else if (typeof data.error === 'string') {
          errorMsg = data.error;
        }
      } else if (data.message) {
        errorMsg = data.message;
      }
    } catch {
      errorMsg = responseText.slice(0, 200) || errorMsg;
    }

    if (statusCode === 401 || statusCode === 403) {
      throw new AIProviderError(
        `Authentication failed: ${errorMsg}`,
        statusCode,
        details,
      );
    }
    if (statusCode === 429) {
      throw new AIProviderError(
        `Rate limit or quota exceeded: ${errorMsg}`,
        statusCode,
        details,
      );
    }
    if (statusCode === 404) {
      throw new AIProviderError(
        `Model or endpoint not found (${this.modelName}): ${errorMsg}`,
        statusCode,
        details,
      );
    }
    throw new AIProviderError(
      `Provider API error (${statusCode}): ${errorMsg}`,
      statusCode,
      details,
    );
  }

  async validateConnection(): Promise<AIValidationResult> {
    const start = Date.now();
    const url = `${this.baseUrl}/models`;
    try {
      const resp = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(Math.min(15, this.timeoutSeconds) * 1000),
      });
      const latencyMs = Date.now() - start;
      if (resp.ok) {
        const data: any = await resp.json();
        const models: string[] = Array.isArray(data?.data)
          ? data.data
              .filter((m: any) => m && typeof m.id === 'string')
              .map((m: any) => m.id)
          : [];
        return {
          is_valid: true,
          latency_ms: latencyMs,
          message: `Successfully connected to provider. ${models.length} models discovered.`,
          available_models: models.slice(0, 30),
        };
      }
      const text = await resp.text();
      this.handleErrorResponse(resp.status, text);
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(
        `Network error connecting to ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async generateResponse(
    messages: Array<Record<string, any>>,
    tools?: Array<Record<string, any>>,
    temperature?: number,
    maxTokens?: number,
  ): Promise<AIResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload: Record<string, any> = {
      model: this.modelName,
      messages,
      temperature: temperature ?? this.temperature,
      max_tokens: maxTokens ?? this.maxOutputTokens,
    };
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    const start = Date.now();
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutSeconds * 1000),
    });
    const latencyMs = Date.now() - start;

    if (!resp.ok) {
      const text = await resp.text();
      this.handleErrorResponse(resp.status, text);
    }

    const data: any = await resp.json();
    const choice = (data.choices || [{}])[0] || {};
    const message = choice.message || {};
    const content = message.content ?? null;
    const rawToolCalls: any[] = message.tool_calls || [];

    const toolCalls: AIToolCall[] = rawToolCalls.map((tc, idx) => {
      const func = tc.function || {};
      const fnName = func.name || '';
      const argsStr = func.arguments || '{}';
      let args: Record<string, any> = {};
      try {
        args = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr;
      } catch {
        args = { raw_arguments: argsStr };
      }
      return {
        id: tc.id || `call_${idx}`,
        name: fnName,
        arguments: args,
      };
    });

    const usage = data.usage || {};
    return {
      content,
      tool_calls: toolCalls,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      latency_ms: latencyMs,
      finish_reason: choice.finish_reason || null,
      model: data.model || this.modelName,
    };
  }

  async generateStructuredResponse(
    messages: Array<Record<string, any>>,
    responseSchema: Record<string, any>,
    temperature?: number,
  ): Promise<Record<string, any>> {
    const schemaInstruction =
      `\n\nCRITICAL INSTRUCTION: You MUST return a single valid JSON object strictly matching this schema. ` +
      `Do NOT include markdown backticks or commentary outside the JSON:\n` +
      `${JSON.stringify(responseSchema, null, 2)}`;

    const enhanced = [...messages];
    const last = enhanced[enhanced.length - 1];
    enhanced[enhanced.length - 1] = {
      role: last.role,
      content: `${last.content}${schemaInstruction}`,
    };

    const response = await this.generateResponse(
      enhanced,
      undefined,
      temperature ?? 0.1,
      this.maxOutputTokens,
    );

    let cleanText = (response.content || '{}').trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    else if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
    cleanText = cleanText.trim();

    try {
      return JSON.parse(cleanText);
    } catch {
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleanText.slice(firstBrace, lastBrace + 1));
      }
      throw new AIProviderError(
        `Provider failed to return valid JSON: ${cleanText.slice(0, 200)}`,
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/embeddings`;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.embeddingModelName,
          input: text.slice(0, 8000),
        }),
        signal: AbortSignal.timeout(Math.min(30, this.timeoutSeconds) * 1000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        return data?.data?.[0]?.embedding || [];
      }
      return [];
    } catch {
      return [];
    }
  }
}

@Injectable()
export class AIProviderService {
  constructor(
    private readonly config: ConfigService,
    private readonly security: SecurityService,
    private readonly db: DatabaseService,
  ) {}

  getProviderForProject(
    projectId?: string | null,
    userId?: string | null,
  ): AIProvider {
    let configObj: AIProviderConfigurationEntity | undefined;

    if (projectId) {
      configObj = this.db.store.ai_provider_configurations
        .filter(
          (c) =>
            c.project_id === projectId &&
            c.is_active &&
            (this.config.isTest || c.provider_name !== 'jgitlab-local'),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    }

    if (!configObj && userId) {
      configObj = this.db.store.ai_provider_configurations
        .filter(
          (c) =>
            c.user_id === userId &&
            c.is_active &&
            (this.config.isTest || c.provider_name !== 'jgitlab-local'),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    }

    if (!configObj) {
      configObj = this.db.store.ai_provider_configurations
        .filter(
          (c) =>
            c.is_active &&
            (this.config.isTest || c.provider_name !== 'jgitlab-local'),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    }

    if (configObj) {
      if (
        configObj.base_url.startsWith('local://') ||
        configObj.provider_name === 'jgitlab-local'
      ) {
        if (this.config.isTest) {
          return new LocalMVPProvider(configObj.model_name);
        }
        throw new AIProviderError(
          'Built-in demo provider is disabled. Please configure a real AI provider (OpenAI, Gemini, Groq, Ollama, DeepSeek, OpenRouter) in Settings > AI Providers.',
          400,
        );
      }
      const decryptedKey = this.security.decryptSecret(configObj.api_key_enc);
      const isClaude =
        configObj.provider_name === 'claude' ||
        configObj.provider_name === 'anthropic' ||
        configObj.model_name.startsWith('claude-') ||
        configObj.base_url.includes('anthropic') ||
        configObj.base_url.includes('mwapi') ||
        decryptedKey.startsWith('sk-ant-') ||
        (decryptedKey.startsWith('sk-') && decryptedKey.length >= 60);

      if (isClaude) {
        return new AnthropicClaudeProvider({
          apiKey: decryptedKey,
          baseUrl: configObj.base_url,
          modelName: configObj.model_name || 'claude-haiku-4-5-20251001',
          temperature: configObj.temperature,
          maxOutputTokens: configObj.max_output_tokens,
          timeoutSeconds: configObj.timeout_seconds,
        });
      }

      const isGemini =
        configObj.provider_name === 'gemini' ||
        configObj.base_url.includes('generativelanguage.googleapis.com') ||
        configObj.model_name.startsWith('gemini-') ||
        decryptedKey.startsWith('AIzaSy') ||
        decryptedKey.startsWith('AQ.');

      if (isGemini) {
        return new GoogleGeminiProvider({
          apiKey: decryptedKey,
          modelName: configObj.model_name || 'gemini-2.5-flash',
          temperature: configObj.temperature,
          maxOutputTokens: configObj.max_output_tokens,
          timeoutSeconds: configObj.timeout_seconds,
        });
      }

      return new OpenAICompatibleProvider({
        apiKey: decryptedKey,
        baseUrl: configObj.base_url,
        modelName: configObj.model_name,
        embeddingModelName: configObj.embedding_model_name,
        temperature: configObj.temperature,
        maxOutputTokens: configObj.max_output_tokens,
        timeoutSeconds: configObj.timeout_seconds,
      });
    }

    const defaultClaudeKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      process.env.CLAUDE_API_KEY ||
      'sk-950c445e255d90e25293a5c9f85def2c9d313dffb7bfe31b8ff611d25244436b';

    if (defaultClaudeKey) {
      return new AnthropicClaudeProvider({
        apiKey: defaultClaudeKey.trim(),
        baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.mwapi.dev',
        modelName:
          process.env.ANTHROPIC_MODEL_NAME || 'claude-haiku-4-5-20251001',
      });
    }

    if (process.env.GEMINI_API_KEY) {
      return new GoogleGeminiProvider({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
      });
    }

    const envKey =
      process.env.OPENAI_API_KEY ||
      process.env.GROQ_API_KEY ||
      '';
    if (envKey) {
      return new OpenAICompatibleProvider({
        apiKey: envKey,
        baseUrl:
          process.env.OPENAI_BASE_URL ||
          (process.env.GROQ_API_KEY
            ? 'https://api.groq.com/openai/v1'
            : 'https://api.openai.com/v1'),
        modelName:
          process.env.OPENAI_MODEL_NAME ||
          (process.env.GROQ_API_KEY
            ? 'llama-3.3-70b-versatile'
            : 'gpt-4o'),
        embeddingModelName:
          process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      });
    }

    if (this.config.isTest) {
      return new LocalMVPProvider();
    }

    throw new AIProviderError(
      'No active AI provider configured. Please configure your API key in Settings > AI Providers.',
      400,
    );
  }
}
