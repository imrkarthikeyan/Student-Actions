from fastapi import APIRouter, HTTPException, Request, status, BackgroundTasks
from app.api.deps import CurrentUser, DB
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse, PasswordChangeRequest
from app.services.auth_service import auth_service
from app.core.security import hash_password, verify_password
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: DB):
    try:
        user = await auth_service.register(db, data)
        return UserResponse(
            id=str(user.id),
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_verified=user.is_verified,
            storage_used_bytes=user.storage_used_bytes,
            storage_limit_bytes=user.storage_limit_bytes,
            created_at=str(user.created_at),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: DB):
    try:
        ip = request.client.host if request.client else ""
        _, tokens = await auth_service.login(db, data, ip)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: DB):
    try:
        return await auth_service.refresh(db, data.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout")
async def logout(data: RefreshRequest, db: DB, current_user: CurrentUser):
    await auth_service.logout(db, data.refresh_token)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        storage_used_bytes=current_user.storage_used_bytes,
        storage_limit_bytes=current_user.storage_limit_bytes,
        created_at=str(current_user.created_at),
    )


@router.put("/me/password")
async def change_password(data: PasswordChangeRequest, current_user: CurrentUser, db: DB):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    return {"message": "Password changed successfully"}
