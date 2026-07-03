import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Text, Integer, Enum as SAEnum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import enum
from app.db.database import Base


class ClipboardType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    URL = "url"
    CODE = "code"
    MARKDOWN = "markdown"


class ClipboardItem(Base):
    __tablename__ = "clipboard_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=True, index=True)

    content_type: Mapped[ClipboardType] = mapped_column(SAEnum(ClipboardType), nullable=False, index=True)

    # Encrypted content for text/code/markdown/url
    encrypted_content: Mapped[str] = mapped_column(Text, nullable=True)

    # File / image metadata
    file_path: Mapped[str] = mapped_column(String(1000), nullable=True)
    file_name: Mapped[str] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    thumbnail_path: Mapped[str] = mapped_column(String(1000), nullable=True)

    # AI-generated fields
    title: Mapped[str] = mapped_column(String(500), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True, index=True)
    language: Mapped[str] = mapped_column(String(50), nullable=True)  # for code snippets
    ocr_text: Mapped[str] = mapped_column(Text, nullable=True)        # OCR output from images

    # Organization
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    pin_order: Mapped[int] = mapped_column(Integer, default=0)

    # Sync / sharing
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    share_token: Mapped[str] = mapped_column(String(64), nullable=True, unique=True, index=True)

    # Expiry
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    # Deduplication
    content_hash: Mapped[str] = mapped_column(String(64), nullable=True, index=True)

    # Extra metadata (URL preview, etc.)
    extra_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    accessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    access_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="clipboard_items")
    embedding: Mapped["ClipboardEmbedding"] = relationship("ClipboardEmbedding", back_populates="clipboard_item", uselist=False, cascade="all, delete-orphan")
    history: Mapped[list["ClipboardHistory"]] = relationship("ClipboardHistory", back_populates="clipboard_item", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ClipboardItem {self.id} ({self.content_type})>"


class ClipboardEmbedding(Base):
    """Stores FAISS index reference and raw embedding vector."""
    __tablename__ = "clipboard_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clipboard_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clipboard_items.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    faiss_id: Mapped[int] = mapped_column(Integer, nullable=True)         # ID in FAISS index
    embedding_model: Mapped[str] = mapped_column(String(100), nullable=True)
    text_used: Mapped[str] = mapped_column(Text, nullable=True)           # text that was embedded
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    clipboard_item: Mapped["ClipboardItem"] = relationship("ClipboardItem", back_populates="embedding")


class ClipboardHistory(Base):
    """Tracks edits/versions of a clipboard item."""
    __tablename__ = "clipboard_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clipboard_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clipboard_items.id", ondelete="CASCADE"), nullable=False, index=True)
    encrypted_content: Mapped[str] = mapped_column(Text, nullable=True)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=True)
    change_summary: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    clipboard_item: Mapped["ClipboardItem"] = relationship("ClipboardItem", back_populates="history")
