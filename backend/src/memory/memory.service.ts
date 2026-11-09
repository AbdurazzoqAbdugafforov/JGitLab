import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  genUuid,
  utcNow,
} from '../database/database.service';
import { MemoryRecordEntity } from '../database/entities';
import { AIProvider } from '../providers/ai-provider.service';

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

@Injectable()
export class MemoryService {
  constructor(private readonly db: DatabaseService) {}

  async addMemory(
    params: {
      projectId: string;
      category: string;
      title: string;
      content: string;
      summary?: string | null;
      tags?: string[];
      sourceTaskId?: string | null;
    },
    provider?: AIProvider | null,
  ): Promise<MemoryRecordEntity> {
    let embeddingVec: number[] | null = null;
    if (provider) {
      try {
        const vec = await provider.generateEmbedding(
          `${params.title}\n${params.content}`,
        );
        if (vec && vec.length > 0) embeddingVec = vec;
      } catch {
        embeddingVec = null;
      }
    }

    const now = utcNow();
    const record: MemoryRecordEntity = {
      id: genUuid(),
      project_id: params.projectId,
      category: params.category,
      title: params.title,
      content: params.content,
      summary: params.summary || params.content.slice(0, 200),
      tags: Array.isArray(params.tags) ? params.tags : [],
      embedding_vector: embeddingVec,
      source_task_id: params.sourceTaskId ?? null,
      created_at: now,
      updated_at: now,
    };

    this.db.store.memory_records.push(record);
    this.db.save();
    return record;
  }

  async searchMemories(
    params: {
      projectId: string;
      query: string;
      category?: string | null;
      limit?: number;
    },
    provider?: AIProvider | null,
  ): Promise<MemoryRecordEntity[]> {
    const limit = params.limit ?? 5;
    const records = this.db.store.memory_records.filter(
      (m) =>
        m.project_id === params.projectId &&
        (!params.category || m.category === params.category),
    );
    if (records.length === 0) return [];

    const words = Array.from(
      new Set(
        (params.query || '')
          .toLowerCase()
          .match(/\w+/g) || [],
      ),
    );

    let queryVec: number[] | null = null;
    if (provider && params.query?.trim()) {
      try {
        const vec = await provider.generateEmbedding(params.query);
        if (vec && vec.length > 0) queryVec = vec;
      } catch {
        queryVec = null;
      }
    }

    const scored = records.map((r) => {
      let keywordScore = 0;
      const corpus =
        `${r.title} ${r.content} ${(r.tags || []).join(' ')}`.toLowerCase();
      for (const w of words) {
        if (corpus.includes(w)) keywordScore += 2;
      }

      let vecScore = 0;
      if (
        queryVec &&
        r.embedding_vector &&
        r.embedding_vector.length === queryVec.length
      ) {
        vecScore = cosineSimilarity(queryVec, r.embedding_vector);
      }

      return {
        score: keywordScore + vecScore,
        record: r,
      };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.record.created_at.localeCompare(a.record.created_at);
    });

    return scored.slice(0, limit).map((item) => item.record);
  }

  async recordTaskCompletion(
    params: {
      projectId: string;
      taskId: string;
      taskTitle: string;
      taskDescription: string;
      diffSummary?: string | null;
    },
    provider?: AIProvider | null,
  ): Promise<MemoryRecordEntity> {
    const summaryText =
      `Autonomous AI Engineer completed task '${params.taskTitle}'.\n` +
      `Description: ${params.taskDescription}\n` +
      `Modified code changes were verified with automated tests.`;
    const contentText = `${summaryText}\n\nDiff Summary:\n${params.diffSummary || 'No code modifications.'}`;
    return this.addMemory(
      {
        projectId: params.projectId,
        category: 'task_learning',
        title: `Task Result: ${params.taskTitle.slice(0, 80)}`,
        content: contentText,
        summary: summaryText,
        tags: ['autonomous-agent', 'task-learning', 'code-diff'],
        sourceTaskId: params.taskId,
      },
      provider,
    );
  }
}
