from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class ShareCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=100_000)
    expires_in_minutes: int = Field(default=30, ge=1, le=10080)  # up to 7 days


class ShareCreateResponse(BaseModel):
    code: str
    expires_at: datetime


class ShareRetrieveResponse(BaseModel):
    content_type: Literal["text", "file"]
    content: Optional[str] = None
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    expires_at: datetime
    view_count: int
