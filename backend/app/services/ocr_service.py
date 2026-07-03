"""
OCR service using EasyOCR. Runs as a background task to avoid blocking the API.
"""
import asyncio
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_reader = None


def _get_reader():
    global _reader
    if _reader is None and settings.OCR_ENABLED:
        try:
            import easyocr
            _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            logger.info("EasyOCR reader initialized")
        except ImportError:
            logger.warning("EasyOCR not installed; OCR disabled")
    return _reader


async def extract_text_from_image(image_bytes: bytes) -> Optional[str]:
    """Run EasyOCR in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_ocr, image_bytes)


def _sync_ocr(image_bytes: bytes) -> Optional[str]:
    reader = _get_reader()
    if reader is None:
        return None
    try:
        import numpy as np
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        arr = np.array(img)
        results = reader.readtext(arr, detail=0, paragraph=True)
        text = "\n".join(results).strip()
        logger.info("OCR extracted %d chars", len(text))
        return text or None
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return None
