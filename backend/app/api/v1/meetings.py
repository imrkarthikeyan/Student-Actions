from fastapi import APIRouter, HTTPException, status

from app.api.deps import DB
from app.schemas.meeting import MeetingCreateRequest, MeetingResponse, MeetingListResponse
from app.services import meeting_service

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(data: MeetingCreateRequest, db: DB):
    meeting = await meeting_service.create_meeting(db, data.title, data.host_name, data.scheduled_at)
    return MeetingResponse.model_validate(meeting)


@router.get("/", response_model=MeetingListResponse)
async def list_meetings(db: DB):
    meetings = await meeting_service.list_active(db)
    return MeetingListResponse(meetings=[MeetingResponse.model_validate(m) for m in meetings])


@router.get("/{room_code}", response_model=MeetingResponse)
async def get_meeting(room_code: str, db: DB):
    meeting = await meeting_service.get_by_code(db, room_code)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return MeetingResponse.model_validate(meeting)


@router.post("/{room_code}/start", response_model=MeetingResponse)
async def start_meeting(room_code: str, db: DB):
    meeting = await meeting_service.get_by_code(db, room_code)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return MeetingResponse.model_validate(await meeting_service.mark_started(db, meeting))


@router.post("/{room_code}/end", response_model=MeetingResponse)
async def end_meeting(room_code: str, db: DB):
    meeting = await meeting_service.get_by_code(db, room_code)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return MeetingResponse.model_validate(await meeting_service.mark_ended(db, meeting))
