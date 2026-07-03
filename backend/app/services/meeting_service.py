"""Meeting scheduling/lookup: instant or scheduled video meetings identified
by a short, shareable room code. Actual call media/signaling is handled over
Socket.IO (see app/websocket/gateway.py) — this service only manages the
meeting's lifecycle metadata."""
import random
import string
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.meeting import Meeting, MeetingStatus


def _generate_room_code() -> str:
    def grp(n: int) -> str:
        return "".join(random.choices(string.ascii_lowercase, k=n))
    return f"{grp(3)}-{grp(4)}-{grp(3)}"


async def _unique_room_code(db: AsyncSession) -> str:
    for _ in range(20):
        code = _generate_room_code()
        existing = await db.execute(select(Meeting).where(Meeting.room_code == code))
        if not existing.scalar_one_or_none():
            return code
    raise RuntimeError("Could not generate a unique room code, try again")


async def create_meeting(
    db: AsyncSession, title: str, host_name: Optional[str], scheduled_at: Optional[datetime]
) -> Meeting:
    code = await _unique_room_code(db)
    is_scheduled_future = bool(scheduled_at and scheduled_at > datetime.now(timezone.utc))
    meeting = Meeting(
        room_code=code,
        title=title,
        host_name=host_name,
        status=MeetingStatus.SCHEDULED if is_scheduled_future else MeetingStatus.LIVE,
        scheduled_at=scheduled_at,
        started_at=None if is_scheduled_future else datetime.now(timezone.utc),
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return meeting


async def get_by_code(db: AsyncSession, room_code: str) -> Optional[Meeting]:
    result = await db.execute(select(Meeting).where(Meeting.room_code == room_code))
    return result.scalar_one_or_none()


async def list_active(db: AsyncSession) -> List[Meeting]:
    """Meetings that haven't ended yet, most recently created first."""
    result = await db.execute(
        select(Meeting)
        .where(Meeting.status != MeetingStatus.ENDED)
        .order_by(Meeting.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


async def mark_started(db: AsyncSession, meeting: Meeting) -> Meeting:
    if meeting.status != MeetingStatus.LIVE:
        meeting.status = MeetingStatus.LIVE
        meeting.started_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(meeting)
    return meeting


async def mark_ended(db: AsyncSession, meeting: Meeting) -> Meeting:
    meeting.status = MeetingStatus.ENDED
    meeting.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(meeting)
    return meeting
