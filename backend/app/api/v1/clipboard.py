import uuid
from fastapi import APIRouter, HTTPException, status, BackgroundTasks, UploadFile, File, Query
from typing import Optional, List
from datetime import datetime

from app.api.deps import CurrentUser, DB
from app.schemas.clipboard import (
    ClipboardItemCreate, ClipboardItemUpdate, ClipboardItemResponse,
    ClipboardListResponse, ClipboardFilter, AICommandRequest, AICommandResponse,
    SemanticSearchRequest, ClipboardType,
)
from app.services.clipboard_service import clipboard_service
from app.services.storage_service import storage_service
from app.services.ocr_service import extract_text_from_image
from app.services import ai_service as ai_mod, search_service
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/clipboard", tags=["clipboard"])


def _serialize(item, content: Optional[str] = None) -> ClipboardItemResponse:
    return ClipboardItemResponse(
        id=item.id,
        content_type=item.content_type,
        content=content,
        title=item.title,
        summary=item.summary,
        category=item.category,
        language=item.language,
        ocr_text=item.ocr_text,
        tags=item.tags or [],
        is_favorite=item.is_favorite,
        is_pinned=item.is_pinned,
        is_deleted=item.is_deleted,
        is_shared=item.is_shared,
        share_token=item.share_token,
        file_name=item.file_name,
        file_size=item.file_size,
        mime_type=item.mime_type,
        thumbnail_path=item.thumbnail_path,
        workspace_id=item.workspace_id,
        expires_at=item.expires_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
        accessed_at=item.accessed_at,
        access_count=item.access_count,
        extra_metadata=item.extra_metadata or {},
    )


@router.post("/", response_model=ClipboardItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: ClipboardItemCreate,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: DB,
):
    item = await clipboard_service.create(db, current_user.id, data, background_tasks)
    content = await clipboard_service.decrypt_item(item)
    return _serialize(item, content)


@router.post("/upload", response_model=ClipboardItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    workspace_id: Optional[uuid.UUID] = Query(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: CurrentUser = None,
    db: DB = None,
):
    """Upload an image or file as a clipboard item."""
    file_path, file_name, file_size, content_hash = await storage_service.save_file(
        file, str(current_user.id)
    )
    mime = file.content_type or "application/octet-stream"
    is_image = mime.startswith("image/")
    content_type = ClipboardType.IMAGE if is_image else ClipboardType.FILE

    from app.db.models.clipboard import ClipboardItem
    item = ClipboardItem(
        owner_id=current_user.id,
        workspace_id=workspace_id,
        content_type=content_type,
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime,
        content_hash=content_hash,
        title=file_name,
    )
    db.add(item)
    await db.flush()

    if is_image and content_type == ClipboardType.IMAGE:
        background_tasks.add_task(_run_ocr_and_save, str(item.id), file_path)

    return _serialize(item)


async def _run_ocr_and_save(item_id: str, file_path: str) -> None:
    from app.db.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.db.models.clipboard import ClipboardItem
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
    except Exception as e:
        logger.error("OCR background task failed for %s: %s", item_id, e)


@router.get("/", response_model=ClipboardListResponse)
async def list_items(
    content_type: Optional[ClipboardType] = Query(None),
    category: Optional[str] = Query(None),
    is_favorite: Optional[bool] = Query(None),
    workspace_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = None,
    db: DB = None,
):
    filters = ClipboardFilter(
        content_type=content_type,
        category=category,
        is_favorite=is_favorite,
        workspace_id=workspace_id,
        search=search,
        include_deleted=include_deleted,
        page=page,
        per_page=per_page,
    )
    items, total = await clipboard_service.list_items(db, current_user.id, filters)
    serialized = []
    for item in items:
        content = await clipboard_service.decrypt_item(item)
        serialized.append(_serialize(item, content))
    return ClipboardListResponse(
        items=serialized,
        total=total,
        page=page,
        per_page=per_page,
        has_next=(page * per_page) < total,
    )


@router.get("/{item_id}", response_model=ClipboardItemResponse)
async def get_item(item_id: uuid.UUID, current_user: CurrentUser, db: DB):
    item = await clipboard_service.get(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    content = await clipboard_service.decrypt_item(item)
    return _serialize(item, content)


@router.put("/{item_id}", response_model=ClipboardItemResponse)
async def update_item(
    item_id: uuid.UUID, data: ClipboardItemUpdate, current_user: CurrentUser, db: DB
):
    item = await clipboard_service.get(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    item = await clipboard_service.update(db, item, data)
    content = await clipboard_service.decrypt_item(item)
    return _serialize(item, content)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: uuid.UUID, current_user: CurrentUser, db: DB):
    item = await clipboard_service.get(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    await clipboard_service.soft_delete(db, item)


@router.post("/{item_id}/restore", response_model=ClipboardItemResponse)
async def restore_item(item_id: uuid.UUID, current_user: CurrentUser, db: DB):
    from app.schemas.clipboard import ClipboardFilter
    filters = ClipboardFilter(include_deleted=True, page=1, per_page=1)
    item = await clipboard_service.get(db, item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    item = await clipboard_service.restore(db, item)
    content = await clipboard_service.decrypt_item(item)
    return _serialize(item, content)


@router.post("/ai/command", response_model=AICommandResponse)
async def run_ai_command(data: AICommandRequest, current_user: CurrentUser, db: DB):
    item = await clipboard_service.get(db, data.clipboard_item_id, current_user.id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    content = await clipboard_service.decrypt_item(item) or item.ocr_text or ""
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No text content available")
    result = await ai_mod.ai_service.run_command(data.command, content, data.extra_params)
    return AICommandResponse(result=result, command=data.command)


@router.post("/search/semantic")
async def semantic_search(data: SemanticSearchRequest, current_user: CurrentUser, db: DB):
    results = await search_service.semantic_search(data.query, data.limit)
    if not results:
        # fallback to keyword search
        filters = ClipboardFilter(search=data.query, page=1, per_page=data.limit)
        items, _ = await clipboard_service.list_items(db, current_user.id, filters)
        out = []
        for item in items:
            content = await clipboard_service.decrypt_item(item)
            out.append({**_serialize(item, content).model_dump(), "score": 1.0})
        return out

    from sqlalchemy import select
    from app.db.models.clipboard import ClipboardItem
    item_ids = [uuid.UUID(r[0]) for r in results if r[0] != "__deleted__"]
    scores = {r[0]: r[1] for r in results}
    rows = await db.execute(
        select(ClipboardItem).where(
            ClipboardItem.id.in_(item_ids),
            ClipboardItem.owner_id == current_user.id,
            ClipboardItem.is_deleted == False,
        )
    )
    items = rows.scalars().all()
    out = []
    for item in items:
        content = await clipboard_service.decrypt_item(item)
        out.append({**_serialize(item, content).model_dump(), "score": scores.get(str(item.id), 0.0)})
    out.sort(key=lambda x: x["score"], reverse=True)
    return out
