"""Quick-share service: sender submits content/a file and gets back a 6-digit
code; a receiver enters that code to retrieve what was shared."""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import encrypt_content
from app.db.models.share import SharedSecret
from app.services.storage_service import storage_service


async def _generate_unique_code(db: AsyncSession) -> str:
    now = datetime.now(timezone.utc)
    for _ in range(20):
        code = f"{secrets.randbelow(1_000_000):06d}"
        existing = await db.execute(
            select(SharedSecret).where(SharedSecret.code == code, SharedSecret.expires_at > now)
        )
        if not existing.scalar_one_or_none():
            return code
    raise RuntimeError("Could not generate a unique share code, try again")


async def create_text_share(db: AsyncSession, content: str, expires_in_minutes: int) -> SharedSecret:
    code = await _generate_unique_code(db)
    share = SharedSecret(
        code=code,
        content=encrypt_content(content),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes),
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return share


async def create_file_share(db: AsyncSession, file: UploadFile, expires_in_minutes: int) -> SharedSecret:
    file_path, file_name, file_size, _hash = await storage_service.save_file(
        file, owner_id="shared", subfolder="shares"
    )
    code = await _generate_unique_code(db)
    share = SharedSecret(
        code=code,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        mime_type=file.content_type,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes),
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)
    return share


async def get_share_by_code(db: AsyncSession, code: str) -> Optional[SharedSecret]:
    result = await db.execute(select(SharedSecret).where(SharedSecret.code == code))
    share = result.scalar_one_or_none()
    if not share or share.expires_at <= datetime.now(timezone.utc):
        return None
    share.view_count += 1
    await db.commit()
    await db.refresh(share)
    return share
