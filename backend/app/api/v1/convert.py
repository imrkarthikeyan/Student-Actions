from pathlib import Path

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.concurrency import run_in_threadpool

from app.core.config import settings
from app.schemas.convert import ConvertResponse, ConversionFormatsResponse
from app.services import convert_service
from app.services.storage_service import storage_service

router = APIRouter(prefix="/convert", tags=["convert"])


@router.get("/formats", response_model=ConversionFormatsResponse)
async def get_supported_formats():
    return ConversionFormatsResponse(
        formats=convert_service.CONVERSION_MAP,
        max_file_size_mb=settings.MAX_FILE_SIZE_MB,
    )


@router.post("/", response_model=ConvertResponse, status_code=status.HTTP_201_CREATED)
async def convert_file(
    target_format: str = Form(...),
    file: UploadFile = File(...),
):
    source_ext = Path(file.filename or "").suffix.lstrip(".")
    if not source_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File has no extension")

    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit",
        )

    try:
        result_bytes, target_ext = await run_in_threadpool(
            convert_service.convert_file, content, source_ext, target_format
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Conversion failed - the file may be corrupted or unsupported",
        )

    stem = Path(file.filename or "converted").stem
    file_path, file_name, file_size = await storage_service.save_bytes(
        result_bytes, f"{stem}.{target_ext}", owner_id="shared", subfolder="converted"
    )
    return ConvertResponse(
        file_name=file_name,
        file_url=f"/storage/{file_path}",
        mime_type=convert_service.MIME_TYPES.get(target_ext, "application/octet-stream"),
        file_size=file_size,
    )
