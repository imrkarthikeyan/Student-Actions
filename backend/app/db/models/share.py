import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class SharedSecret(Base):
    """A short-lived, 6-digit-code-protected piece of shared content (text or file)."""

    __tablename__ = "shared_secrets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False, index=True)

    # Encrypted text content (text shares only)
    content: Mapped[str] = mapped_column(Text, nullable=True)

    # File metadata (file shares only)
    file_path: Mapped[str] = mapped_column(String(500), nullable=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)

    view_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<SharedSecret {self.code}>"
