from typing import Annotated
import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.db.models.user import User
from app.core.config import settings


async def get_public_user(db: AsyncSession = Depends(get_db)) -> User:
    result = await db.execute(select(User).where(User.id == uuid.UUID(settings.PUBLIC_USER_ID)))
    return result.scalar_one()


CurrentUser = Annotated[User, Depends(get_public_user)]
DB = Annotated[AsyncSession, Depends(get_db)]
