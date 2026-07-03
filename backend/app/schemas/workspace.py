from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid
from app.db.models.workspace import WorkspaceRole


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    slug: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None


class WorkspaceMemberResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: WorkspaceRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    slug: str
    avatar_url: Optional[str]
    is_personal: bool
    member_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.EDITOR


class UpdateMemberRoleRequest(BaseModel):
    role: WorkspaceRole
