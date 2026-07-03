from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime
import uuid
from app.db.models.clipboard import ClipboardType


class ClipboardItemCreate(BaseModel):
    content_type: ClipboardType
    content: Optional[str] = None          # plaintext (will be encrypted server-side)
    title: Optional[str] = None
    tags: List[str] = []
    workspace_id: Optional[uuid.UUID] = None
    expires_at: Optional[datetime] = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 10 * 1024 * 1024:  # 10 MB text limit
            raise ValueError("Content exceeds 10 MB limit")
        return v


class ClipboardItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    is_pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None


class ClipboardItemResponse(BaseModel):
    id: uuid.UUID
    content_type: ClipboardType
    content: Optional[str] = None          # decrypted on read
    title: Optional[str] = None
    summary: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None
    ocr_text: Optional[str] = None
    tags: List[str] = []
    is_favorite: bool
    is_pinned: bool
    is_deleted: bool
    is_shared: bool
    share_token: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    thumbnail_path: Optional[str] = None
    workspace_id: Optional[uuid.UUID] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    accessed_at: Optional[datetime] = None
    access_count: int
    extra_metadata: dict = {}

    model_config = {"from_attributes": True}


class ClipboardListResponse(BaseModel):
    items: List[ClipboardItemResponse]
    total: int
    page: int
    per_page: int
    has_next: bool


class ClipboardFilter(BaseModel):
    content_type: Optional[ClipboardType] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    workspace_id: Optional[uuid.UUID] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    per_page: int = 20
    include_deleted: bool = False


class AICommandRequest(BaseModel):
    command: str  # /summarize /translate /rewrite /explain /markdown
    clipboard_item_id: uuid.UUID
    extra_params: Optional[dict] = None


class AICommandResponse(BaseModel):
    result: str
    command: str
    tokens_used: Optional[int] = None


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 10
    workspace_id: Optional[uuid.UUID] = None
    content_type: Optional[ClipboardType] = None
