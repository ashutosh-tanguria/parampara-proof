"""Craftsperson videos: YouTube links (embedded on the client) or uploaded MP4/WebM files (max 50 MB)."""
import logging
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from pydantic import BaseModel

from .auth import clean, require_craftsperson, validate_art_form
from .db import like_pattern
from .errors import AppError

log = logging.getLogger("parampara.videos")

MAX_VIDEO_BYTES = 50 * 1024 * 1024
LEVELS = ("Beginner", "Intermediate", "Advanced")
YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"}

VIDEO_SELECT = ("SELECT v.*, u.display_name AS t_name, u.art_form AS t_art, u.region AS t_region, u.is_demo AS t_demo "
                "FROM videos v JOIN users u ON u.id = v.owner_id")

MESSAGES = {
    "type": "Unsupported video. Please upload an MP4 or WebM file.",
    "too_large": "This video is larger than 50 MB. Please upload a smaller file or paste a YouTube link instead.",
    "empty": "This video file is empty.",
}


def parse_youtube(url: str) -> str:
    """Return the 11-character video id from a YouTube link, or raise a 400."""
    from urllib.parse import parse_qs, urlparse

    u = urlparse((url or "").strip())
    host = (u.hostname or "").lower()
    if u.scheme not in ("http", "https") or host not in YOUTUBE_HOSTS:
        raise AppError(400, "invalid_youtube_link", "Please paste a YouTube link, for example https://www.youtube.com/watch?v=...")
    if host == "youtu.be":
        vid = u.path.lstrip("/").split("/")[0]
    elif u.path == "/watch":
        vid = (parse_qs(u.query).get("v") or [""])[0]
    else:
        m = re.match(r"^/(?:embed|shorts|live|v)/([^/?]+)", u.path)
        vid = m.group(1) if m else ""
    if not YOUTUBE_ID.match(vid):
        raise AppError(400, "invalid_youtube_link", "We could not find a video id in that link. Please check it and try again.")
    return vid


def detect_video(head: bytes, filename: str) -> tuple[str, str]:
    """Check the file by content (not by name or Content-Type). Returns (extension, mime type)."""
    ext = Path(filename or "").suffix.lower()
    if head[4:8] == b"ftyp":
        kind = (".mp4", "video/mp4")
    elif head[:4] == b"\x1a\x45\xdf\xa3" and b"webm" in head[:512].lower():
        kind = (".webm", "video/webm")
    else:
        raise AppError(400, "unsupported_video_type", MESSAGES["type"])
    if ext != kind[0]:
        raise AppError(400, "unsupported_video_type", MESSAGES["type"])
    return kind


def video_json(row) -> dict:
    return {
        "id": row["id"], "title": row["title"], "description": row["description"], "art_form": row["art_form"], "level": row["level"],
        "kind": row["kind"], "youtube_id": row["youtube_id"] if row["kind"] == "youtube" else None,
        "file_url": f"/media/videos/{row['file_name']}" if row["kind"] == "upload" else None,
        "file_size": row["file_size"], "mime": row["mime"], "is_demo": bool(row["is_demo"]), "created_at": row["created_at"],
        "teacher": {"id": row["owner_id"], "display_name": row["t_name"], "art_form": row["t_art"], "region": row["t_region"], "is_demo": bool(row["t_demo"])},
    }


class VideoRequest(BaseModel):
    title: str = ""
    description: str = ""
    art_form: str | None = None
    level: str = ""
    youtube_url: str = ""


def _fields(req_title: str, description: str, art_form: str | None, level: str) -> tuple[str, str, str, str]:
    title = clean(req_title, 100)
    if len(title) < 3:
        raise AppError(400, "invalid_title", "Please enter a title of at least 3 characters.")
    if level not in LEVELS:
        raise AppError(400, "invalid_level", "Please choose Beginner, Intermediate or Advanced.")
    return title, clean(description, 1000), validate_art_form(art_form), level


router = APIRouter(prefix="/api/videos")


@router.get("")
def list_videos(request: Request, q: str = "", art_form: str = "", level: str = "", limit: int = 30, offset: int = 0):
    where, args = [], []
    if q.strip():
        where.append("(v.title LIKE ? ESCAPE '\\' OR v.description LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')")
        args += [like_pattern(q.strip()[:80])] * 3
    if art_form.strip():
        where.append("v.art_form = ?")
        args.append(art_form.lower().strip())
    if level.strip() in LEVELS:
        where.append("v.level = ?")
        args.append(level.strip())
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    limit = max(1, min(limit, 60))
    with request.app.state.db.connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM videos v JOIN users u ON u.id = v.owner_id{clause}", args).fetchone()[0]
        rows = db.execute(f"{VIDEO_SELECT}{clause} ORDER BY v.id DESC LIMIT ? OFFSET ?", [*args, limit, max(0, offset)]).fetchall()
    return {"videos": [video_json(r) for r in rows], "total": total}


@router.post("", status_code=201)
def create_video(req: VideoRequest, request: Request, user=Depends(require_craftsperson)):
    title, description, art, level = _fields(req.title, req.description, req.art_form, level=req.level)
    vid = parse_youtube(req.youtube_url)
    with request.app.state.db.connect() as db:
        cur = db.execute("INSERT INTO videos (owner_id,title,description,art_form,level,kind,youtube_id) VALUES (?,?,?,?,?,'youtube',?)",
                         (user["id"], title, description, art, level, vid))
        row = db.execute(f"{VIDEO_SELECT} WHERE v.id = ?", (cur.lastrowid,)).fetchone()
    return video_json(row)


@router.post("/upload", status_code=201)
async def upload_video(request: Request, file: UploadFile = File(...), title: str = Form(""), description: str = Form(""),
                       art_form: str = Form(""), level: str = Form(""), user=Depends(require_craftsperson)):
    t, d, art, lv = _fields(title, description, art_form, level)
    head = await file.read(1024)
    if not head:
        raise AppError(400, "empty_file", MESSAGES["empty"])
    ext, mime = detect_video(head, file.filename or "")
    folder = request.app.state.settings.data_dir / "uploads" / "videos"
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    path = folder / name
    size = len(head)
    try:
        with open(path, "wb") as out:
            out.write(head)
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_VIDEO_BYTES:
                    raise AppError(400, "file_too_large", MESSAGES["too_large"])
                out.write(chunk)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    with request.app.state.db.connect() as db:
        cur = db.execute("INSERT INTO videos (owner_id,title,description,art_form,level,kind,file_name,file_size,mime) VALUES (?,?,?,?,?,'upload',?,?,?)",
                         (user["id"], t, d, art, lv, name, size, mime))
        row = db.execute(f"{VIDEO_SELECT} WHERE v.id = ?", (cur.lastrowid,)).fetchone()
    return video_json(row)


@router.get("/{video_id}")
def video_detail(video_id: int, request: Request):
    with request.app.state.db.connect() as db:
        row = db.execute(f"{VIDEO_SELECT} WHERE v.id = ?", (video_id,)).fetchone()
        if not row:
            raise AppError(404, "video_not_found", "We could not find that video. It may have been deleted.")
        teacher = db.execute("SELECT * FROM users WHERE id = ?", (row["owner_id"],)).fetchone()
        related = db.execute(f"{VIDEO_SELECT} WHERE v.art_form = ? AND v.id != ? ORDER BY v.id DESC LIMIT 4", (row["art_form"], video_id)).fetchall()
    from .auth import public_user
    return {"video": video_json(row), "teacher": public_user(teacher), "related": [video_json(r) for r in related]}


def _own(db, video_id: int, user):
    row = db.execute("SELECT * FROM videos WHERE id = ?", (video_id,)).fetchone()
    if not row:
        raise AppError(404, "video_not_found", "We could not find that video. It may have been deleted.")
    if row["owner_id"] != user["id"]:
        raise AppError(403, "not_owner", "You can only change your own videos.")
    return row


@router.put("/{video_id}")
def update_video(video_id: int, req: VideoRequest, request: Request, user=Depends(require_craftsperson)):
    title, description, art, level = _fields(req.title, req.description, req.art_form, req.level)
    with request.app.state.db.connect() as db:
        row = _own(db, video_id, user)
        vid = row["youtube_id"]
        if row["kind"] == "youtube" and req.youtube_url.strip():
            vid = parse_youtube(req.youtube_url)
        db.execute("UPDATE videos SET title=?, description=?, art_form=?, level=?, youtube_id=?, updated_at=datetime('now') WHERE id=?",
                   (title, description, art, level, vid, video_id))
        out = db.execute(f"{VIDEO_SELECT} WHERE v.id = ?", (video_id,)).fetchone()
    return video_json(out)


@router.delete("/{video_id}")
def delete_video(video_id: int, request: Request, user=Depends(require_craftsperson)):
    with request.app.state.db.connect() as db:
        row = _own(db, video_id, user)
        db.execute("DELETE FROM videos WHERE id = ?", (video_id,))
    if row["kind"] == "upload" and row["file_name"]:
        (request.app.state.settings.data_dir / "uploads" / "videos" / row["file_name"]).unlink(missing_ok=True)
    return {"ok": True}
