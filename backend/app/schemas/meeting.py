import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class MeetingCreateRequest(BaseModel):
    title: str = Field(default="Instant Meeting", max_length=200)
    host_name: Optional[str] = Field(default=None, max_length=100)
    scheduled_at: Optional[datetime] = None  # None = start immediately


class MeetingResponse(BaseModel):
    id: uuid.UUID
    room_code: str
    title: str
    host_name: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MeetingListResponse(BaseModel):
    meetings: List[MeetingResponse]
