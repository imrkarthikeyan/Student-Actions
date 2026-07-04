from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import socketio
from pathlib import Path

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.api.v1 import api_router
from app.websocket.gateway import sio

setup_logging()
logger = get_logger(__name__)


async def _seed_public_user() -> None:
    """Ensure the shared anonymous user exists in the database."""
    import uuid
    from sqlalchemy import select
    from app.db.database import AsyncSessionLocal
    from app.db.models.user import User
    from app.core.security import hash_password

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == uuid.UUID(settings.PUBLIC_USER_ID)))
        if not result.scalar_one_or_none():
            db.add(User(
                id=uuid.UUID(settings.PUBLIC_USER_ID),
                email=settings.PUBLIC_EMAIL,
                username=settings.PUBLIC_USERNAME,
                hashed_password=hash_password("public-user"),
                is_active=True,
                is_verified=True,
            ))
            await db.commit()
            logger.info("Seeded public user %s", settings.PUBLIC_USER_ID)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SmartSync AI starting up (env=%s)", settings.ENVIRONMENT)
    Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    Path(settings.FAISS_INDEX_PATH).mkdir(parents=True, exist_ok=True)
    await _seed_public_user()
    yield
    logger.info("SmartSync AI shutting down")


limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

fastapi_app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Universal AI-powered clipboard synchronisation platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

fastapi_app.state.limiter = limiter
fastapi_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@fastapi_app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@fastapi_app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


@fastapi_app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal error occurred"},
    )


fastapi_app.include_router(api_router)

# Serve static storage files in development
if settings.STORAGE_BACKEND == "local":
    Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    fastapi_app.mount("/storage", StaticFiles(directory=settings.LOCAL_STORAGE_PATH), name="storage")

# Mount Socket.io
socket_app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/ws/socket.io")

# Export as `app` for uvicorn
app = socket_app
