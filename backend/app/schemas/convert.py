from typing import Dict, List
from pydantic import BaseModel


class ConvertResponse(BaseModel):
    file_name: str
    file_url: str
    mime_type: str
    file_size: int


class ConversionFormatsResponse(BaseModel):
    formats: Dict[str, List[str]]
    max_file_size_mb: int
