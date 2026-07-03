import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    ENDED = "ended"


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    host_name: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[MeetingStatus] = mapped_column(SAEnum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False, index=True)

    # Null scheduled_at means "start immediately"
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Meeting {self.room_code} ({self.status})>"
