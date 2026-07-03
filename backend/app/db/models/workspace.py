import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import enum
from app.db.database import Base


class WorkspaceRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    is_personal: Mapped[bool] = mapped_column(Boolean, default=False)
    max_members: Mapped[int] = mapped_column(default=10)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members: Mapped[list["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    clipboard_items: Mapped[list["ClipboardItem"]] = relationship("ClipboardItem", back_populates=None, foreign_keys="ClipboardItem.workspace_id")
    invites: Mapped[list["WorkspaceInvite"]] = relationship("WorkspaceInvite", back_populates="workspace", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Workspace {self.name}>"


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[WorkspaceRole] = mapped_column(SAEnum(WorkspaceRole), default=WorkspaceRole.EDITOR)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="workspace_memberships")


class WorkspaceInvite(Base):
    __tablename__ = "workspace_invites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(SAEnum(WorkspaceRole), default=WorkspaceRole.EDITOR)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[InviteStatus] = mapped_column(SAEnum(InviteStatus), default=InviteStatus.PENDING)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="invites")
