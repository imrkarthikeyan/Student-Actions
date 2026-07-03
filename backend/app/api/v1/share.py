from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form

from app.api.deps import DB
from app.core.security import decrypt_content
from app.schemas.share import ShareCreateRequest, ShareCreateResponse, ShareRetrieveResponse
from app.services import share_service

router = APIRouter(prefix="/share", tags=["share"])


@router.post("/", response_model=ShareCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_text_share(data: ShareCreateRequest, db: DB):
    share = await share_service.create_text_share(db, data.content, data.expires_in_minutes)
    return ShareCreateResponse(code=share.code, expires_at=share.expires_at)


@router.post("/upload", response_model=ShareCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_file_share(
    db: DB,
    file: UploadFile = File(...),
    expires_in_minutes: int = Form(default=30),
):
    try:
        share = await share_service.create_file_share(db, file, expires_in_minutes)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ShareCreateResponse(code=share.code, expires_at=share.expires_at)


@router.get("/{code}", response_model=ShareRetrieveResponse)
async def retrieve_share(code: str, db: DB):
    share = await share_service.get_share_by_code(db, code)
    if not share:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired code")

    if share.file_path:
        return ShareRetrieveResponse(
            content_type="file",
            file_name=share.file_name,
            file_url=f"/storage/{share.file_path}",
            mime_type=share.mime_type,
            file_size=share.file_size,
            expires_at=share.expires_at,
            view_count=share.view_count,
        )
    return ShareRetrieveResponse(
        content_type="text",
        content=decrypt_content(share.content),
        expires_at=share.expires_at,
        view_count=share.view_count,
    )
