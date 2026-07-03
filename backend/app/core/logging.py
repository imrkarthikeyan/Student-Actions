import logging
import sys
from app.core.config import settings


def setup_logging() -> None:
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    fmt = "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s"
    logging.basicConfig(
        level=level,
        format=fmt,
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Silence noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
