"""
Celery background tasks: OCR, AI enrichment, and maintenance.
"""
import asyncio
import uuid
from datetime import datetime, timezone

from app.workers.celery_app import celery_app
from app.core.logging import get_logger

logger = get_logger(__name__)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_ocr(self, item_id: str, file_path: str):
    """Extract text from an image clipboard item via OCR."""
    async def _run():
        from app.db.database import AsyncSessionLocal
        from app.db.models.clipboard import ClipboardItem
        from app.services.ocr_service import extract_text_from_image
        from app.services.storage_service import storage_service
        from sqlalchemy import select

        try:
            file_bytes = await storage_service.get_file_bytes(file_path)
            ocr_text = await extract_text_from_image(file_bytes)
            if ocr_text:
                async with AsyncSessionLocal() as db:
                    result = await db.execute(select(ClipboardItem).where(ClipboardItem.id == uuid.UUID(item_id)))
                    item = result.scalar_one_or_none()
                    if item:
                        item.ocr_text = ocr_text
                        await db.commit()
                        logger.info("OCR complete for item %s (%d chars)", item_id, len(ocr_text))
        except Exception as exc:
            logger.error("OCR task failed for %s: %s", item_id, exc)
            raise self.retry(exc=exc)

    _run_async(_run())


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def enrich_clipboard_item(self, item_id: str, content: str, content_type: str):
    """AI categorisation + embedding for a clipboard item."""
    async def _run():
        from app.services.clipboard_service import clipboard_service
        await clipboard_service._enrich_item(item_id, content, content_type)

    try:
        _run_async(_run())
    except Exception as exc:
        raise self.retry(exc=exc)


@celery_app.task
def cleanup_expired_items():
    """Soft-delete clipboard items past their expiry date."""
    async def _run():
        from app.db.database import AsyncSessionLocal
        from app.db.models.clipboard import ClipboardItem
        from sqlalchemy import update

        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(ClipboardItem)
                .where(ClipboardItem.expires_at <= now, ClipboardItem.is_deleted == False)
                .values(is_deleted=True, deleted_at=now)
            )
            await db.commit()
            logger.info("Expired clipboard items cleaned up at %s", now)

    _run_async(_run())


# Beat schedule
celery_app.conf.beat_schedule = {
    "cleanup-expired-every-hour": {
        "task": "app.workers.tasks.cleanup_expired_items",
        "schedule": 3600.0,  # every hour
    }
}
