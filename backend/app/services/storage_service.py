import os
import uuid
import hashlib
import aiofiles
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    """Abstraction over local filesystem and S3-compatible storage."""

    def __init__(self) -> None:
        self.backend = settings.STORAGE_BACKEND
        if self.backend == "local":
            Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
        elif self.backend == "s3":
            self._init_s3()

    def _init_s3(self) -> None:
        import boto3
        self._s3 = boto3.client(
            "s3",
            region_name=settings.S3_REGION,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )

    async def save_file(
        self,
        file: UploadFile,
        owner_id: str,
        subfolder: str = "files",
    ) -> Tuple[str, str, int, str]:
        """
        Save an uploaded file. Returns (file_path, file_name, file_size, content_hash).
        """
        content = await file.read()
        file_size = len(content)
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise ValueError(f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

        content_hash = hashlib.sha256(content).hexdigest()
        ext = Path(file.filename or "file").suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        relative_path = f"{owner_id}/{subfolder}/{unique_name}"

        if self.backend == "local":
            full_path = Path(settings.LOCAL_STORAGE_PATH) / relative_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(full_path, "wb") as f:
                await f.write(content)
        else:
            self._s3.put_object(
                Bucket=settings.S3_BUCKET,
                Key=relative_path,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )

        logger.info("Saved file %s (%d bytes)", relative_path, file_size)
        return relative_path, file.filename or unique_name, file_size, content_hash

    async def save_bytes(
        self,
        content: bytes,
        file_name: str,
        owner_id: str,
        subfolder: str = "files",
    ) -> Tuple[str, str, int]:
        """Save raw bytes (e.g. a generated file). Returns (file_path, file_name, file_size)."""
        file_size = len(content)
        ext = Path(file_name).suffix
        unique_name = f"{uuid.uuid4().hex}{ext}"
        relative_path = f"{owner_id}/{subfolder}/{unique_name}"

        if self.backend == "local":
            full_path = Path(settings.LOCAL_STORAGE_PATH) / relative_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            async with aiofiles.open(full_path, "wb") as f:
                await f.write(content)
        else:
            self._s3.put_object(Bucket=settings.S3_BUCKET, Key=relative_path, Body=content)

        logger.info("Saved generated file %s (%d bytes)", relative_path, file_size)
        return relative_path, file_name, file_size

    async def get_file_bytes(self, file_path: str) -> bytes:
        if self.backend == "local":
            full_path = Path(settings.LOCAL_STORAGE_PATH) / file_path
            async with aiofiles.open(full_path, "rb") as f:
                return await f.read()
        else:
            resp = self._s3.get_object(Bucket=settings.S3_BUCKET, Key=file_path)
            return resp["Body"].read()

    async def delete_file(self, file_path: str) -> None:
        if self.backend == "local":
            full_path = Path(settings.LOCAL_STORAGE_PATH) / file_path
            if full_path.exists():
                full_path.unlink()
        else:
            self._s3.delete_object(Bucket=settings.S3_BUCKET, Key=file_path)

    def get_public_url(self, file_path: str) -> str:
        if self.backend == "local":
            return f"/api/v1/files/{file_path}"
        else:
            if settings.S3_ENDPOINT_URL:
                return f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET}/{file_path}"
            return f"https://{settings.S3_BUCKET}.s3.{settings.S3_REGION}.amazonaws.com/{file_path}"


storage_service = StorageService()
