from fastapi import APIRouter
from sqlalchemy import select, func

from app.api.deps import CurrentUser, DB
from app.db.models.clipboard import ClipboardItem
from app.db.models.workspace import WorkspaceMember
from app.schemas.dashboard import DashboardResponse, StorageStats, ActivityEntry
from app.services.clipboard_service import clipboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(current_user: CurrentUser, db: DB):
    # Storage
    storage = StorageStats(
        used_bytes=current_user.storage_used_bytes,
        limit_bytes=current_user.storage_limit_bytes,
        used_percent=round(current_user.storage_used_bytes / max(current_user.storage_limit_bytes, 1) * 100, 2),
    )

    # Clipboard stats
    clip_stats = await clipboard_service.get_stats(db, current_user.id)

    # Recent activity (last 10 items)
    act_rows = await db.execute(
        select(ClipboardItem)
        .where(ClipboardItem.owner_id == current_user.id)
        .order_by(ClipboardItem.created_at.desc())
        .limit(10)
    )
    activity = [
        ActivityEntry(
            id=str(i.id),
            content_type=i.content_type.value,
            title=i.title or i.file_name or i.content_type.value,
            action="deleted" if i.is_deleted else "created",
            created_at=i.created_at,
        )
        for i in act_rows.scalars().all()
    ]

    # Workspace count
    ws_count = await db.execute(
        select(func.count()).select_from(WorkspaceMember).where(WorkspaceMember.user_id == current_user.id)
    )

    return DashboardResponse(
        storage=storage,
        clipboard=clip_stats,
        recent_activity=activity,
        workspace_count=ws_count.scalar_one(),
    )
