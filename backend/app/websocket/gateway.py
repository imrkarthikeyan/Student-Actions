"""
Socket.io gateway for real-time clipboard synchronisation.
Each user connects to their personal room; workspace members share a workspace room.
"""
import uuid
import socketio
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.security import verify_token
from app.core.logging import get_logger

logger = get_logger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

_redis: aioredis.Redis | None = None

# sid -> {"room_code": str, "name": str} for participants currently in a meeting room.
# In-memory is fine here: signaling only matters for peers connected to this same process.
_meeting_participants: dict[str, dict] = {}


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None):
    from app.core.config import settings
    user_id = settings.PUBLIC_USER_ID

    await sio.save_session(sid, {"user_id": user_id})
    await sio.enter_room(sid, f"user:{user_id}")

    try:
        redis = await get_redis()
        await redis.hset("ws:users", user_id, sid)
    except Exception:
        pass

    await sio.emit("connected", {"user_id": user_id}, room=sid)
    logger.info("WS connected sid=%s", sid)


@sio.event
async def disconnect(sid: str):
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    if user_id:
        redis = await get_redis()
        await redis.hdel("ws:users", user_id)

    meeting_info = _meeting_participants.pop(sid, None)
    if meeting_info:
        room = f"meeting:{meeting_info['room_code']}"
        await sio.emit("meeting:peer_left", {"sid": sid}, room=room)

    logger.info("WS disconnected sid=%s user_id=%s", sid, user_id)


@sio.event
async def join_workspace(sid: str, data: dict):
    workspace_id = data.get("workspace_id")
    if workspace_id:
        await sio.enter_room(sid, f"workspace:{workspace_id}")
        logger.debug("sid=%s joined workspace room %s", sid, workspace_id)


@sio.event
async def leave_workspace(sid: str, data: dict):
    workspace_id = data.get("workspace_id")
    if workspace_id:
        await sio.leave_room(sid, f"workspace:{workspace_id}")


# ── Meeting / WebRTC signaling ────────────────────────────────────────────────
# Mesh topology: a newly-joined peer initiates a WebRTC offer to every peer
# already in the room; existing peers only respond. This gives every peer an
# unambiguous role and avoids "who offers to whom" glare.

@sio.on("meeting:join")
async def meeting_join(sid: str, data: dict):
    room_code = data.get("room_code")
    name = (data.get("name") or "Guest").strip()[:100]
    if not room_code:
        return
    room = f"meeting:{room_code}"

    existing_peers = [
        {"sid": s, "name": info["name"]}
        for s, info in _meeting_participants.items()
        if info["room_code"] == room_code
    ]
    _meeting_participants[sid] = {"room_code": room_code, "name": name}
    await sio.enter_room(sid, room)

    await sio.emit("meeting:peers", {"peers": existing_peers}, room=sid)
    await sio.emit("meeting:peer_joined", {"sid": sid, "name": name}, room=room, skip_sid=sid)
    logger.info("sid=%s joined meeting %s as %s", sid, room_code, name)


@sio.on("meeting:leave")
async def meeting_leave(sid: str, data: dict):
    info = _meeting_participants.pop(sid, None)
    if info:
        room = f"meeting:{info['room_code']}"
        await sio.leave_room(sid, room)
        await sio.emit("meeting:peer_left", {"sid": sid}, room=room)


@sio.on("meeting:signal")
async def meeting_signal(sid: str, data: dict):
    """Relay a WebRTC offer/answer/ICE candidate to one specific peer."""
    target = data.get("target")
    signal = data.get("signal")
    if not target or signal is None:
        return
    await sio.emit("meeting:signal", {"sid": sid, "signal": signal}, room=target)


# ── Public broadcast helpers ──────────────────────────────────────────────────

async def broadcast_clipboard_event(
    user_id: str,
    event: str,
    payload: dict,
    workspace_id: str | None = None,
) -> None:
    """Push a clipboard event to a user (and optionally their workspace)."""
    await sio.emit(event, payload, room=f"user:{user_id}")
    if workspace_id:
        await sio.emit(event, payload, room=f"workspace:{workspace_id}")
