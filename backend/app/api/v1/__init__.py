from fastapi import APIRouter
from app.api.v1 import auth, clipboard, workspaces, dashboard, share, meetings, convert

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(clipboard.router)
api_router.include_router(workspaces.router)
api_router.include_router(dashboard.router)
api_router.include_router(share.router)
api_router.include_router(meetings.router)
api_router.include_router(convert.router)
