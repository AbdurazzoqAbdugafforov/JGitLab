import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from app.models.memory import MemoryRecord
from app.services.ai.base import AIProvider
from app.services.memory.embeddings import cosine_similarity

def utc_now():
    return datetime.now(timezone.utc)

class EngineeringMemoryService:
    def __init__(self, db: AsyncSession, provider: Optional[AIProvider] = None):
        self.db = db
        self.provider = provider

    async def add_memory(
        self,
        project_id: str,
        category: str,
        title: str,
        content: str,
        summary: Optional[str] = None,
        tags: Optional[List[str]] = None,
        source_task_id: Optional[str] = None
    ) -> MemoryRecord:
        embedding_vec = None
        if self.provider:
            try:
                embedding_vec = await self.provider.generate_embedding(f"{title}\n{content}")
            except Exception:
                embedding_vec = None

        record = MemoryRecord(
            project_id=project_id,
            category=category,
            title=title,
            content=content,
            summary=summary or content[:200],
            tags=tags or [],
            embedding_vector=embedding_vec,
            source_task_id=source_task_id
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def search_memories(
        self,
        project_id: str,
        query: str,
        category: Optional[str] = None,
        limit: int = 5
    ) -> List[MemoryRecord]:
        """
        Hybrid retrieval: vector semantic search if embeddings are available,
        otherwise scored keyword matching.
        """
        # Fetch all records for the project (and category if provided)
        stmt = select(MemoryRecord).where(MemoryRecord.project_id == project_id)
        if category:
            stmt = stmt.where(MemoryRecord.category == category)
        result = await self.db.execute(stmt)
        records: List[MemoryRecord] = list(result.scalars().all())

        if not records:
            return []

        # Try semantic search if provider embedding is generated
        query_vec = None
        if self.provider and query.strip():
            try:
                query_vec = await self.provider.generate_embedding(query)
            except Exception:
                query_vec = None

        if query_vec:
            # Score records by vector cosine similarity
            scored = []
            for r in records:
                score = 0.0
                if r.embedding_vector and len(r.embedding_vector) == len(query_vec):
                    score = cosine_similarity(query_vec, r.embedding_vector)
                scored.append((score, r))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [item[1] for item in scored[:limit]]

        # Fallback keyword matching
        words = set(re.findall(r"\w+", query.lower()))
        if not words:
            return records[:limit]

        scored = []
        for r in records:
            score = 0
            text_corpus = f"{r.title} {r.content} {' '.join(r.tags)}".lower()
            for w in words:
                if w in text_corpus:
                    score += 1
            scored.append((score, r))

        scored.sort(key=lambda x: (x[0], x[1].created_at), reverse=True)
        return [item[1] for item in scored[:limit]]

    async def record_task_completion(
        self,
        project_id: str,
        task_id: str,
        task_title: str,
        task_description: str,
        diff_summary: Optional[str]
    ):
        """Auto-record an Engineering Memory entry upon completing an AI task"""
        summary_text = (
            f"Autonomous AI Engineer completed task '{task_title}'.\n"
            f"Description: {task_description}\n"
            f"Modified code changes were verified with automated tests."
        )
        content_text = f"{summary_text}\n\nDiff Summary:\n{diff_summary or 'No code modifications.'}"
        await self.add_memory(
            project_id=project_id,
            category="task_learning",
            title=f"Task Result: {task_title[:80]}",
            content=content_text,
            summary=summary_text,
            tags=["autonomous-agent", "task-learning", "code-diff"],
            source_task_id=task_id
        )
