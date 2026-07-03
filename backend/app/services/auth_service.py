import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models.user import User, RefreshToken
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse

logger = get_logger(__name__)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:

    async def register(self, db: AsyncSession, data: RegisterRequest) -> User:
        # Check uniqueness
        existing = await db.execute(
            select(User).where((User.email == data.email) | (User.username == data.username))
        )
        if existing.scalar_one_or_none():
            raise ValueError("Email or username already in use")

        user = User(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
        )
        db.add(user)
        await db.flush()
        logger.info("Registered user %s", user.email)
        return user

    async def login(
        self, db: AsyncSession, data: LoginRequest, ip_address: str = ""
    ) -> Tuple[User, TokenResponse]:
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(data.password, user.hashed_password):
            raise ValueError("Invalid credentials")
        if not user.is_active:
            raise ValueError("Account is deactivated")

        # Create tokens
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        # Persist refresh token
        db.add(RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ))

        user.last_login_at = datetime.now(timezone.utc)
        await db.flush()

        token_resp = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
        return user, token_resp

    async def refresh(self, db: AsyncSession, token: str) -> TokenResponse:
        subject = verify_token(token, "refresh")
        if not subject:
            raise ValueError("Invalid or expired refresh token")

        token_hash = _hash_token(token)
        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.now(timezone.utc),
            )
        )
        stored = result.scalar_one_or_none()
        if not stored:
            raise ValueError("Refresh token not found or revoked")

        # Rotate token
        stored.is_revoked = True
        new_refresh = create_refresh_token(subject)
        db.add(RefreshToken(
            user_id=stored.user_id,
            token_hash=_hash_token(new_refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ))
        await db.flush()

        return TokenResponse(
            access_token=create_access_token(subject),
            refresh_token=new_refresh,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, db: AsyncSession, token: str) -> None:
        token_hash = _hash_token(token)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        stored = result.scalar_one_or_none()
        if stored:
            stored.is_revoked = True
            await db.flush()

    async def get_user_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


auth_service = AuthService()
