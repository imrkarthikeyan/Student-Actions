import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.api.deps import CurrentUser, DB
from app.db.models.workspace import Workspace, WorkspaceMember, WorkspaceInvite, WorkspaceRole, InviteStatus
from app.schemas.workspace import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    WorkspaceMemberResponse, InviteMemberRequest, UpdateMemberRoleRequest,
)
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _to_slug(name: str) -> str:
    import re
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"{slug}-{secrets.token_hex(3)}"


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(data: WorkspaceCreate, current_user: CurrentUser, db: DB):
    slug = data.slug or _to_slug(data.name)
    ws = Workspace(
        owner_id=current_user.id,
        name=data.name,
        description=data.description,
        slug=slug,
    )
    db.add(ws)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=current_user.id, role=WorkspaceRole.OWNER))
    await db.flush()
    return WorkspaceResponse(
        id=ws.id, name=ws.name, description=ws.description, slug=ws.slug,
        avatar_url=ws.avatar_url, is_personal=ws.is_personal, member_count=1, created_at=ws.created_at,
    )


@router.get("/", response_model=list[WorkspaceResponse])
async def list_workspaces(current_user: CurrentUser, db: DB):
    rows = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    workspaces = rows.scalars().all()
    result = []
    for ws in workspaces:
        count = await db.execute(select(func.count()).where(WorkspaceMember.workspace_id == ws.id))
        result.append(WorkspaceResponse(
            id=ws.id, name=ws.name, description=ws.description, slug=ws.slug,
            avatar_url=ws.avatar_url, is_personal=ws.is_personal,
            member_count=count.scalar_one(), created_at=ws.created_at,
        ))
    return result


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: uuid.UUID, current_user: CurrentUser, db: DB):
    ws = await _get_member_workspace(db, workspace_id, current_user.id)
    count = await db.execute(select(func.count()).where(WorkspaceMember.workspace_id == ws.id))
    return WorkspaceResponse(
        id=ws.id, name=ws.name, description=ws.description, slug=ws.slug,
        avatar_url=ws.avatar_url, is_personal=ws.is_personal,
        member_count=count.scalar_one(), created_at=ws.created_at,
    )


@router.post("/{workspace_id}/invite")
async def invite_member(workspace_id: uuid.UUID, data: InviteMemberRequest, current_user: CurrentUser, db: DB):
    ws = await _get_member_workspace(db, workspace_id, current_user.id, min_role=WorkspaceRole.ADMIN)
    token = secrets.token_urlsafe(32)
    invite = WorkspaceInvite(
        workspace_id=ws.id,
        invited_by_id=current_user.id,
        email=data.email,
        role=data.role,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.flush()
    return {"message": f"Invite sent to {data.email}", "invite_token": token}


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
async def list_members(workspace_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await _get_member_workspace(db, workspace_id, current_user.id)
    from app.db.models.user import User
    rows = await db.execute(
        select(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(WorkspaceMember.workspace_id == workspace_id)
    )
    return [
        WorkspaceMemberResponse(
            user_id=m.user_id, username=u.username, full_name=u.full_name,
            avatar_url=u.avatar_url, role=m.role, joined_at=m.joined_at,
        )
        for m, u in rows
    ]


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(workspace_id: uuid.UUID, user_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await _get_member_workspace(db, workspace_id, current_user.id, min_role=WorkspaceRole.ADMIN)
    row = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
    )
    member = row.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == WorkspaceRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot remove workspace owner")
    await db.delete(member)


async def _get_member_workspace(
    db, workspace_id: uuid.UUID, user_id: uuid.UUID, min_role: WorkspaceRole | None = None
) -> Workspace:
    row = await db.execute(
        select(Workspace, WorkspaceMember)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(Workspace.id == workspace_id, WorkspaceMember.user_id == user_id)
    )
    result = row.first()
    if not result:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    ws, member = result
    role_order = [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER]
    if min_role and role_order.index(member.role) < role_order.index(min_role):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return ws
