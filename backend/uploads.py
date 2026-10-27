"""Upload validation and storage.

Limits and messages MUST stay identical to frontend/src/lib/validate.ts.
"""
import io
import logging
import time
import uuid
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from .errors import AppError

log = logging.getLogger("parampara.uploads")

MIN_DIMENSION = 30
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
STORED_MAX_SIDE = 1600

MESSAGES = {
    "type": "Unsupported file type. Please upload a JPG, PNG or WEBP image.",
    "empty": "This file is empty.",
    "too_large": "This image is larger than {mb} MB. Please choose a smaller file.",
    "too_small": f"This image is too small (minimum {MIN_DIMENSION} px on the shortest side).",
    "unreadable": "We could not read this image. It may be corrupted.",
    "too_many_pixels": "This image has too many pixels (maximum {mp} megapixels). Please resize it and try again.",
}

_MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"RIFF")


def _looks_like_image_file(data: bytes) -> bool:
    return data.startswith(_MAGIC[0]) or data.startswith(_MAGIC[1]) or (data.startswith(b"RIFF") and data[8:12] == b"WEBP")


def decode_image(data: bytes, max_bytes: int, max_pixels: int) -> Image.Image:
    """Validate by content (not by file name or Content-Type) and return an upright RGB image."""
    if len(data) == 0:
        raise AppError(400, "empty_file", MESSAGES["empty"])
    if len(data) > max_bytes:
        raise AppError(400, "file_too_large", MESSAGES["too_large"].format(mb=max_bytes // (1024 * 1024)))
    try:
        probe = Image.open(io.BytesIO(data))  # reads the header only
    except Image.DecompressionBombError:
        raise AppError(400, "too_many_pixels", MESSAGES["too_many_pixels"].format(mp=max_pixels // 1_000_000)) from None
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
        # Not something Pillow can identify: a corrupt supported image, or another kind of file entirely.
        code, msg = ("unreadable_image", "unreadable") if _looks_like_image_file(data) else ("unsupported_type", "type")
        raise AppError(400, code, MESSAGES[msg]) from None
    if probe.format not in ALLOWED_FORMATS:
        raise AppError(400, "unsupported_type", MESSAGES["type"])
    w, h = probe.size
    if w * h > max_pixels:
        raise AppError(400, "too_many_pixels", MESSAGES["too_many_pixels"].format(mp=max_pixels // 1_000_000))
    try:
        probe.verify()
        im = Image.open(io.BytesIO(data))
        if getattr(im, "n_frames", 1) > 1:
            im.seek(0)  # animated WebP/APNG: use the first frame
        im.load()  # raises on truncated data
    except Exception:
        raise AppError(400, "unreadable_image", MESSAGES["unreadable"]) from None

    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        im = background
    else:
        im = im.convert("RGB")  # CMYK, greyscale, palette, 16-bit
    if min(im.size) < MIN_DIMENSION:
        raise AppError(400, "image_too_small", MESSAGES["too_small"])
    return im


def downscale(im: Image.Image, max_side: int = STORED_MAX_SIDE) -> Image.Image:
    if max(im.size) <= max_side:
        return im
    copy = im.copy()
    copy.thumbnail((max_side, max_side), Image.LANCZOS)
    return copy


def save_upload(im: Image.Image, upload_dir: Path) -> tuple[str, str]:
    """Store a re-encoded copy under a random id. The original file name is never used.

    Re-encoding also drops EXIF metadata (for example GPS position).
    """
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex
    name = f"{file_id}.jpg"
    downscale(im).save(upload_dir / name, "JPEG", quality=90, optimize=True)
    return file_id, name


def cleanup_uploads(upload_dir: Path, ttl_seconds: float, now: float | None = None) -> int:
    """Delete stored files older than the TTL. Returns how many were removed."""
    now = now if now is not None else time.time()
    removed = 0
    if not upload_dir.exists():
        return 0
    for f in upload_dir.glob("*.jpg"):
        try:
            if now - f.stat().st_mtime > ttl_seconds:
                f.unlink()
                removed += 1
        except OSError:
            log.warning("could not remove %s", f.name)
    return removed
