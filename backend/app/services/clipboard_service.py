"""
Core clipboard business logic: CRUD, encryption, AI enrichment, deduplication.
"""
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update, delete
from sqlalchemy.orm import selectinload
from fastapi import BackgroundTasks

from app.db.models.clipboard import ClipboardItem, ClipboardEmbedding, ClipboardHistory, ClipboardType
from app.core.security import encrypt_content, decrypt_content
from app.core.logging import get_logger
from app.schemas.clipboard import ClipboardItemCreate, ClipboardItemUpdate, ClipboardFilter
from app.services import ai_service, search_service

logger = get_logger(__name__)


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


class ClipboardService:

    async def create(
        self,
        db: AsyncSession,
        owner_id: uuid.UUID,
        data: ClipboardItemCreate,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> ClipboardItem:
        # Deduplication check for text-based types
        raw_content = data.content or ""
        chash = _content_hash(raw_content) if raw_content else None

        if chash:
            existing = await db.execute(
                select(ClipboardItem).where(
                    ClipboardItem.owner_id == owner_id,
                    ClipboardItem.content_hash == chash,
                    ClipboardItem.is_deleted == False,
                )
            )
            dup = existing.scalar_one_or_none()
            if dup:
                # Bump access count and return existing item
                dup.access_count += 1
                dup.accessed_at = datetime.now(timezone.utc)
                await db.flush()
                return dup

        encrypted = encrypt_content(raw_content) if raw_content else None

        item = ClipboardItem(
            owner_id=owner_id,
            workspace_id=data.workspace_id,
            content_type=data.content_type,
            encrypted_content=encrypted,
            title=data.title,
            tags=data.tags,
            expires_at=data.expires_at,
            content_hash=chash,
        )
        db.add(item)
        await db.flush()

        # Save to history
        if encrypted:
            db.add(ClipboardHistory(
                clipboard_item_id=item.id,
                encrypted_content=encrypted,
                change_summary="Initial creation",
            ))

        # Schedule AI enrichment asynchronously
        if background_tasks and raw_content:
            background_tasks.add_task(self._enrich_item, str(item.id), raw_content, data.content_type.value)

        logger.info("Created clipboard item %s (type=%s)", item.id, item.content_type)
        return item

    async def _enrich_item(self, item_id: str, content: str, content_type: str) -> None:
        """AI categorisation + embedding generation (runs in background)."""
        from app.db.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(select(ClipboardItem).where(ClipboardItem.id == uuid.UUID(item_id)))
                item = result.scalar_one_or_none()
                if not item:
                    return

                # AI categorise
                ai_meta = await ai_service.ai_service.categorize_and_tag(content, content_type)
                item.category = ai_meta.get("category")
                item.tags = list(set((item.tags or []) + (ai_meta.get("tags") or [])))
                if not item.title:
                    item.title = ai_meta.get("title")

                # Embedding
                text_for_embedding = f"{item.title or ''} {item.category or ''} {content[:512]}"
                faiss_id = await search_service.add_to_index(item_id, text_for_embedding)
                if faiss_id is not None:
                    emb = ClipboardEmbedding(
                        clipboard_item_id=item.id,
                        faiss_id=faiss_id,
                        embedding_model=ai_service.settings.EMBEDDING_MODEL if hasattr(ai_service, "settings") else "local",
                        text_used=text_for_embedding[:500],
                    )
                    db.add(emb)

                await db.commit()
                logger.info("Enriched clipboard item %s", item_id)
            except Exception as e:
                logger.error("Failed to enrich item %s: %s", item_id, e)
                await db.rollback()

    async def get(self, db: AsyncSession, item_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[ClipboardItem]:
        result = await db.execute(
            select(ClipboardItem).where(
                ClipboardItem.id == item_id,
                ClipboardItem.owner_id == owner_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_items(
        self,
        db: AsyncSession,
        owner_id: uuid.UUID,
        filters: ClipboardFilter,
    ) -> Tuple[List[ClipboardItem], int]:
        conditions = [ClipboardItem.owner_id == owner_id]

        if not filters.include_deleted:
            conditions.append(ClipboardItem.is_deleted == False)
        if filters.content_type:
            conditions.append(ClipboardItem.content_type == filters.content_type)
        if filters.category:
            conditions.append(ClipboardItem.category == filters.category)
        if filters.is_favorite is not None:
            conditions.append(ClipboardItem.is_favorite == filters.is_favorite)
        if filters.workspace_id:
            conditions.append(ClipboardItem.workspace_id == filters.workspace_id)
        if filters.date_from:
            conditions.append(ClipboardItem.created_at >= filters.date_from)
        if filters.date_to:
            conditions.append(ClipboardItem.created_at <= filters.date_to)
        if filters.tags:
            from sqlalchemy.dialects.postgresql import ARRAY
            from sqlalchemy import String, cast
            conditions.append(ClipboardItem.tags.overlap(filters.tags))

        # SQL keyword search (semantic search handled separately)
        if filters.search:
            term = f"%{filters.search}%"
            conditions.append(or_(
                ClipboardItem.title.ilike(term),
                ClipboardItem.summary.ilike(term),
                ClipboardItem.category.ilike(term),
                ClipboardItem.ocr_text.ilike(term),
            ))

        base_q = select(ClipboardItem).where(and_(*conditions))

        # Count
        count_q = select(func.count()).select_from(base_q.subquery())
        total = (await db.execute(count_q)).scalar_one()

        # Paginate, pinned first then newest
        offset = (filters.page - 1) * filters.per_page
        items_q = (
            base_q
            .order_by(ClipboardItem.is_pinned.desc(), ClipboardItem.created_at.desc())
            .offset(offset)
            .limit(filters.per_page)
        )
        rows = await db.execute(items_q)
        return list(rows.scalars().all()), total

    async def update(
        self,
        db: AsyncSession,
        item: ClipboardItem,
        data: ClipboardItemUpdate,
    ) -> ClipboardItem:
        if data.content is not None:
            # Archive current version
            db.add(ClipboardHistory(
                clipboard_item_id=item.id,
                encrypted_content=item.encrypted_content,
                change_summary="Content updated",
            ))
            item.encrypted_content = encrypt_content(data.content)
            item.content_hash = _content_hash(data.content)

        for field in ("title", "tags", "is_favorite", "is_pinned", "expires_at"):
            val = getattr(data, field, None)
            if val is not None:
                setattr(item, field, val)

        await db.flush()
        return item

    async def soft_delete(self, db: AsyncSession, item: ClipboardItem) -> None:
        item.is_deleted = True
        item.deleted_at = datetime.now(timezone.utc)
        await db.flush()

    async def restore(self, db: AsyncSession, item: ClipboardItem) -> ClipboardItem:
        item.is_deleted = False
        item.deleted_at = None
        await db.flush()
        return item

    async def decrypt_item(self, item: ClipboardItem) -> Optional[str]:
        if item.encrypted_content:
            return decrypt_content(item.encrypted_content)
        return None

    async def get_stats(self, db: AsyncSession, owner_id: uuid.UUID) -> dict:
        rows = await db.execute(
            select(ClipboardItem.content_type, func.count())
            .where(ClipboardItem.owner_id == owner_id, ClipboardItem.is_deleted == False)
            .group_by(ClipboardItem.content_type)
        )
        by_type = {r[0].value: r[1] for r in rows}
        total = sum(by_type.values())

        fav = await db.execute(
            select(func.count()).where(
                ClipboardItem.owner_id == owner_id,
                ClipboardItem.is_favorite == True,
                ClipboardItem.is_deleted == False,
            )
        )
        shared = await db.execute(
            select(func.count()).where(
                ClipboardItem.owner_id == owner_id,
                ClipboardItem.is_shared == True,
                ClipboardItem.is_deleted == False,
            )
        )
        from datetime import timedelta
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        this_week = await db.execute(
            select(func.count()).where(
                ClipboardItem.owner_id == owner_id,
                ClipboardItem.created_at >= week_ago,
            )
        )
        return {
            "total_items": total,
            "by_type": by_type,
            "favorites": fav.scalar_one(),
            "shared": shared.scalar_one(),
            "items_this_week": this_week.scalar_one(),
        }


clipboard_service = ClipboardService()
