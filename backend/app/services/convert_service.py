"""Quick Convert: turn an uploaded file into a different format.

Supported today:
- Documents: pdf <-> docx, pdf <-> txt, docx <-> txt
- Images: png/jpg/webp/bmp/gif <-> each other, and any of them <-> pdf (first page only for pdf -> image)

Everything runs locally with pure-Python libraries (Pillow, PyMuPDF, pdf2docx,
mammoth, xhtml2pdf) - no LibreOffice/MS Office install required.
"""
import html
import io
import tempfile
from pathlib import Path
from typing import Tuple

import fitz  # PyMuPDF
import mammoth
from docx import Document
from PIL import Image
from xhtml2pdf import pisa

IMAGE_EXTS = {"png", "jpg", "webp", "bmp", "gif"}
DOCUMENT_EXTS = {"pdf", "docx", "txt"}

CONVERSION_MAP: dict[str, list[str]] = {
    "pdf": ["docx", "txt", "png", "jpg"],
    "docx": ["pdf", "txt"],
    "txt": ["pdf", "docx"],
    "png": ["jpg", "webp", "bmp", "gif", "pdf"],
    "jpg": ["png", "webp", "bmp", "gif", "pdf"],
    "webp": ["png", "jpg", "bmp", "gif", "pdf"],
    "bmp": ["png", "jpg", "webp", "gif", "pdf"],
    "gif": ["png", "jpg", "webp", "bmp", "pdf"],
}

MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "png": "image/png",
    "jpg": "image/jpeg",
    "webp": "image/webp",
    "bmp": "image/bmp",
    "gif": "image/gif",
}

_PIL_FORMAT = {"jpg": "JPEG", "png": "PNG", "webp": "WEBP", "bmp": "BMP", "gif": "GIF"}


def normalize_ext(ext: str) -> str:
    ext = ext.lower().lstrip(".")
    return "jpg" if ext == "jpeg" else ext


def convert_file(content: bytes, source_ext: str, target_ext: str) -> Tuple[bytes, str]:
    """Convert raw file bytes. Returns (converted_bytes, target_ext). Raises ValueError
    if the conversion isn't supported or the input can't be parsed."""
    source_ext = normalize_ext(source_ext)
    target_ext = normalize_ext(target_ext)

    valid_targets = CONVERSION_MAP.get(source_ext)
    if not valid_targets or target_ext not in valid_targets:
        raise ValueError(f"Converting .{source_ext} to .{target_ext} isn't supported")

    if source_ext in IMAGE_EXTS and target_ext in IMAGE_EXTS:
        return _image_to_image(content, target_ext), target_ext
    if source_ext in IMAGE_EXTS and target_ext == "pdf":
        return _image_to_pdf(content), target_ext
    if source_ext == "pdf" and target_ext in IMAGE_EXTS:
        return _pdf_to_image(content, target_ext), target_ext
    if source_ext == "pdf" and target_ext == "docx":
        return _pdf_to_docx(content), target_ext
    if source_ext == "pdf" and target_ext == "txt":
        return _pdf_to_txt(content), target_ext
    if source_ext == "docx" and target_ext == "pdf":
        return _docx_to_pdf(content), target_ext
    if source_ext == "docx" and target_ext == "txt":
        return _docx_to_txt(content), target_ext
    if source_ext == "txt" and target_ext == "pdf":
        return _txt_to_pdf(content), target_ext
    if source_ext == "txt" and target_ext == "docx":
        return _txt_to_docx(content), target_ext

    raise ValueError(f"Converting .{source_ext} to .{target_ext} isn't supported")


def _image_to_image(content: bytes, target_ext: str) -> bytes:
    img = Image.open(io.BytesIO(content))
    fmt = _PIL_FORMAT[target_ext]
    if fmt == "JPEG" and img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format=fmt)
    return out.getvalue()


def _image_to_pdf(content: bytes) -> bytes:
    img = Image.open(io.BytesIO(content))
    if img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format="PDF")
    return out.getvalue()


def _pdf_to_image(content: bytes, target_ext: str) -> bytes:
    doc = fitz.open(stream=content, filetype="pdf")
    try:
        page = doc[0]
        pix = page.get_pixmap(dpi=150)
        png_bytes = pix.tobytes("png")
    finally:
        doc.close()
    if target_ext == "png":
        return png_bytes
    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    out = io.BytesIO()
    img.save(out, format=_PIL_FORMAT[target_ext])
    return out.getvalue()


def _pdf_to_txt(content: bytes) -> bytes:
    doc = fitz.open(stream=content, filetype="pdf")
    try:
        text = "\n\n".join(page.get_text() for page in doc)
    finally:
        doc.close()
    return text.encode("utf-8")


def _pdf_to_docx(content: bytes) -> bytes:
    from pdf2docx import Converter

    with tempfile.TemporaryDirectory() as tmp:
        pdf_path = Path(tmp) / "in.pdf"
        docx_path = Path(tmp) / "out.docx"
        pdf_path.write_bytes(content)
        cv = Converter(str(pdf_path))
        try:
            cv.convert(str(docx_path))
        finally:
            cv.close()
        return docx_path.read_bytes()


def _docx_to_pdf(content: bytes) -> bytes:
    result = mammoth.convert_to_html(io.BytesIO(content))
    html_doc = f"<html><body>{result.value}</body></html>"
    out = io.BytesIO()
    pdf_status = pisa.CreatePDF(io.StringIO(html_doc), dest=out)
    if pdf_status.err:
        raise ValueError("Could not render this document as a PDF")
    return out.getvalue()


def _docx_to_txt(content: bytes) -> bytes:
    result = mammoth.extract_raw_text(io.BytesIO(content))
    return result.value.encode("utf-8")


def _txt_to_pdf(content: bytes) -> bytes:
    text = content.decode("utf-8", errors="replace")
    escaped = html.escape(text)
    html_doc = (
        "<html><body><pre style='font-family: monospace; font-size: 10pt; "
        f"white-space: pre-wrap;'>{escaped}</pre></body></html>"
    )
    out = io.BytesIO()
    pdf_status = pisa.CreatePDF(io.StringIO(html_doc), dest=out)
    if pdf_status.err:
        raise ValueError("Could not render this text as a PDF")
    return out.getvalue()


def _txt_to_docx(content: bytes) -> bytes:
    text = content.decode("utf-8", errors="replace")
    doc = Document()
    for line in text.split("\n"):
        doc.add_paragraph(line)
    out = io.BytesIO()
    doc.save(out)
    return out.getvalue()
