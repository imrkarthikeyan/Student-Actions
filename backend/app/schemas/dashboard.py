from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime


class StorageStats(BaseModel):
    used_bytes: int
    limit_bytes: int
    used_percent: float


class ClipboardStats(BaseModel):
    total_items: int
    by_type: Dict[str, int]
    favorites: int
    shared: int
    items_this_week: int


class ActivityEntry(BaseModel):
    id: str
    content_type: str
    title: str | None
    action: str   # "created" | "updated" | "deleted"
    created_at: datetime


class DashboardResponse(BaseModel):
    storage: StorageStats
    clipboard: ClipboardStats
    recent_activity: List[ActivityEntry]
    workspace_count: int
