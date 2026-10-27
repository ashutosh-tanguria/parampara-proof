"""Marketplace listings: browse and enquire only. No checkout, no payments, no authenticity or verification claims."""
import logging
import uuid

from fastapi import APIRouter, Depends, File, Request, UploadFile
from pydantic import BaseModel

from .auth import clean, public_user, require_craftsperson, validate_art_form
from .db import like_pattern
from .errors import AppError
from .uploads import decode_image, downscale

log = logging.getLogger("parampara.listings")

MAX_IMAGES = 4
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
MAX_PRICE_INR = 10_000_000
BANNER = ("Demo marketplace. No payments are taken. Listings are not verified. "
          "Authenticity checks and artist verification are planned for the next phase.")

LISTING_SELECT = ("SELECT l.*, u.display_name AS t_name, u.art_form AS t_art, u.region AS t_region, u.is_demo AS t_demo "
                  "FROM listings l JOIN users u ON u.id = l.owner_id")


def listing_json(db, row) -> dict:
    images = [f"/media/listings/{r['file_name']}" for r in db.execute("SELECT file_name FROM listing_images WHERE listing_id=? ORDER BY position, id", (row["id"],))]
    return {
        "id": row["id"], "title": row["title"], "description": row["description"], "art_form": row["art_form"], "price_inr": row["price_inr"],
        "size": row["size"], "materials": row["materials"], "credit": row["credit"], "is_demo": bool(row["is_demo"]), "images": images,
        "created_at": row["created_at"],
        "craftsperson": {"id": row["owner_id"], "display_name": row["t_name"], "art_form": row["t_art"], "region": row["t_region"], "is_demo": bool(row["t_demo"])},
    }


class ListingRequest(BaseModel):
    title: str = ""
    description: str = ""
    art_form: str | None = None
    price_inr: int = 0
    size: str = ""
    materials: str = ""


def _fields(req: ListingRequest):
    title = clean(req.title, 80)
    if len(title) < 3:
        raise AppError(400, "invalid_title", "Please enter a title of at least 3 characters.")
    if not 1 <= req.price_inr <= MAX_PRICE_INR:
        raise AppError(400, "invalid_price", "Please enter an indicative price in rupees between 1 and 10,000,000.")
    return title, clean(req.description, 1000), validate_art_form(req.art_form), req.price_inr, clean(req.size, 60), clean(req.materials, 120)


router = APIRouter(prefix="/api/listings")


@router.get("")
def list_listings(request: Request, q: str = "", art_form: str = "", min_price: int = 0, max_price: int = 0, limit: int = 30, offset: int = 0):
    where, args = [], []
    if q.strip():
        where.append("(l.title LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\')")
        args += [like_pattern(q.strip()[:80])] * 3
    if art_form.strip():
        where.append("l.art_form = ?")
        args.append(art_form.lower().strip())
    if min_price > 0:
        where.append("l.price_inr >= ?")
        args.append(min_price)
    if max_price > 0:
        where.append("l.price_inr <= ?")
        args.append(max_price)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    limit = max(1, min(limit, 60))
    with request.app.state.db.connect() as db:
        total = db.execute(f"SELECT COUNT(*) FROM listings l JOIN users u ON u.id = l.owner_id{clause}", args).fetchone()[0]
        rows = db.execute(f"{LISTING_SELECT}{clause} ORDER BY l.id DESC LIMIT ? OFFSET ?", [*args, limit, max(0, offset)]).fetchall()
        items = [listing_json(db, r) for r in rows]
    return {"listings": items, "total": total, "banner": BANNER}


@router.post("", status_code=201)
def create_listing(req: ListingRequest, request: Request, user=Depends(require_craftsperson)):
    title, description, art, price, size, materials = _fields(req)
    with request.app.state.db.connect() as db:
        cur = db.execute("INSERT INTO listings (owner_id,title,description,art_form,price_inr,size,materials) VALUES (?,?,?,?,?,?,?)",
                         (user["id"], title, description, art, price, size, materials))
        row = db.execute(f"{LISTING_SELECT} WHERE l.id = ?", (cur.lastrowid,)).fetchone()
        return listing_json(db, row)


def _own(db, listing_id: int, user):
    row = db.execute("SELECT * FROM listings WHERE id = ?", (listing_id,)).fetchone()
    if not row:
        raise AppError(404, "listing_not_found", "We could not find that listing. It may have been deleted.")
    if row["owner_id"] != user["id"]:
        raise AppError(403, "not_owner", "You can only change your own listings.")
    return row


@router.post("/{listing_id}/images", status_code=201)
async def upload_images(listing_id: int, request: Request, files: list[UploadFile] = File(...), user=Depends(require_craftsperson)):
    db_ = request.app.state.db
    with db_.connect() as db:
        _own(db, listing_id, user)
        existing = db.execute("SELECT COUNT(*) FROM listing_images WHERE listing_id=?", (listing_id,)).fetchone()[0]
    if existing + len(files) > MAX_IMAGES:
        raise AppError(400, "too_many_images", f"A listing can have at most {MAX_IMAGES} images ({existing} already uploaded).")
    folder = request.app.state.settings.data_dir / "uploads" / "listings"
    folder.mkdir(parents=True, exist_ok=True)
    saved = []
    try:
        for f in files:
            data = await f.read(MAX_IMAGE_BYTES + 1)
            im = decode_image(data, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS)  # checks type by content, size, pixels; drops EXIF on re-encode
            name = f"{uuid.uuid4().hex}.jpg"
            downscale(im, 1600).save(folder / name, "JPEG", quality=88, optimize=True)
            saved.append(name)
    except Exception:
        for n in saved:
            (folder / n).unlink(missing_ok=True)
        raise
    with db_.connect() as db:
        for i, n in enumerate(saved):
            db.execute("INSERT INTO listing_images (listing_id, file_name, position) VALUES (?,?,?)", (listing_id, n, existing + i))
        row = db.execute(f"{LISTING_SELECT} WHERE l.id = ?", (listing_id,)).fetchone()
        return listing_json(db, row)


@router.delete("/{listing_id}/images/{index}")
def delete_image(listing_id: int, index: int, request: Request, user=Depends(require_craftsperson)):
    with request.app.state.db.connect() as db:
        _own(db, listing_id, user)
        rows = db.execute("SELECT id, file_name FROM listing_images WHERE listing_id=? ORDER BY position, id", (listing_id,)).fetchall()
        if not 0 <= index < len(rows):
            raise AppError(404, "image_not_found", "That image does not exist.")
        db.execute("DELETE FROM listing_images WHERE id = ?", (rows[index]["id"],))
    (request.app.state.settings.data_dir / "uploads" / "listings" / rows[index]["file_name"]).unlink(missing_ok=True)
    return {"ok": True}


@router.get("/{listing_id}")
def listing_detail(listing_id: int, request: Request):
    with request.app.state.db.connect() as db:
        row = db.execute(f"{LISTING_SELECT} WHERE l.id = ?", (listing_id,)).fetchone()
        if not row:
            raise AppError(404, "listing_not_found", "We could not find that listing. It may have been deleted.")
        teacher = db.execute("SELECT * FROM users WHERE id = ?", (row["owner_id"],)).fetchone()
        return {"listing": listing_json(db, row), "craftsperson": public_user(teacher), "banner": BANNER}


@router.put("/{listing_id}")
def update_listing(listing_id: int, req: ListingRequest, request: Request, user=Depends(require_craftsperson)):
    title, description, art, price, size, materials = _fields(req)
    with request.app.state.db.connect() as db:
        _own(db, listing_id, user)
        db.execute("UPDATE listings SET title=?, description=?, art_form=?, price_inr=?, size=?, materials=?, updated_at=datetime('now') WHERE id=?",
                   (title, description, art, price, size, materials, listing_id))
        row = db.execute(f"{LISTING_SELECT} WHERE l.id = ?", (listing_id,)).fetchone()
        return listing_json(db, row)


@router.delete("/{listing_id}")
def delete_listing(listing_id: int, request: Request, user=Depends(require_craftsperson)):
    with request.app.state.db.connect() as db:
        _own(db, listing_id, user)
        names = [r["file_name"] for r in db.execute("SELECT file_name FROM listing_images WHERE listing_id=?", (listing_id,))]
        db.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
    for n in names:
        if not n.startswith("demo-"):  # seeded demo images are shared files; keep them
            (request.app.state.settings.data_dir / "uploads" / "listings" / n).unlink(missing_ok=True)
    return {"ok": True}
