"""Accounts: username + password sign-up and login with a signed, HTTP-only session cookie.

Passwords are hashed with scrypt (standard library) and are never stored or logged in plain text.
"""
import base64
import hashlib
import hmac
import json
import logging
import re
import secrets
import time

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel

from .content import CATALOGUE
from .errors import AppError
from .stores import RateLimiter

log = logging.getLogger("parampara.auth")

SESSION_COOKIE = "pp_session"
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1
USERNAME_RE = re.compile(r"^[a-z0-9._+-]{1,64}@[a-z0-9.-]{1,120}\.[a-z]{2,24}$")
CONTROL = re.compile(r"[\x00-\x1f\x7f]")
ROLES = ("learner", "craftsperson")
ART_FORMS = tuple(CATALOGUE)
PROFILE_NOTE = "Profiles are not verified in this demo."


def clean(value: str | None, limit: int) -> str:
    return CONTROL.sub("", value or "").strip()[:limit]


# ---- passwords -------------------------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return "scrypt${}${}${}${}${}".format(SCRYPT_N, SCRYPT_R, SCRYPT_P, base64.b64encode(salt).decode(), base64.b64encode(digest).decode())


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, digest_b64 = stored.split("$")
        if scheme != "scrypt":
            return False
        expected = base64.b64decode(digest_b64)
        digest = hashlib.scrypt(password.encode("utf-8"), salt=base64.b64decode(salt_b64), n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


_DUMMY_HASH = hash_password("not-a-real-password")  # used so unknown users take as long as known ones


# ---- session tokens --------------------------------------------------------------------------------------------
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def make_token(secret: str, user_id: int, days: int, now: float | None = None) -> str:
    payload = _b64(json.dumps({"uid": user_id, "exp": int((now or time.time()) + days * 86400)}).encode())
    sig = _b64(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def read_token(secret: str, token: str | None, now: float | None = None) -> int | None:
    if not token or "." not in token:
        return None
    payload, _, sig = token.partition(".")
    expected = _b64(hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if data["exp"] < (now or time.time()):
            return None
        return int(data["uid"])
    except (ValueError, KeyError, TypeError):
        return None


# ---- helpers shared by the other routers --------------------------------------------------------------------------
def public_user(row) -> dict:
    """What other people may see. The username (an email-style login) is never shown to others."""
    return {"id": row["id"], "display_name": row["display_name"], "role": row["role"], "bio": row["bio"],
            "art_form": row["art_form"], "region": row["region"], "is_demo": bool(row["is_demo"])}


def own_user(row) -> dict:
    return {**public_user(row), "username": row["username"]}


def current_user(request: Request):
    uid = read_token(request.app.state.settings.session_secret, request.cookies.get(SESSION_COOKIE))
    if uid is None:
        return None
    with request.app.state.db.connect() as db:
        return db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()


def _check_origin(request: Request) -> None:
    """Extra CSRF defence for cookie-authenticated writes (the cookie is also SameSite=Lax)."""
    origin = request.headers.get("origin")
    if request.method in ("GET", "HEAD", "OPTIONS") or not origin:
        return
    host = request.headers.get("host", "")
    allowed = request.app.state.settings.allowed_origins
    if origin.split("://", 1)[-1] != host and origin not in allowed:
        raise AppError(403, "bad_origin", "This request came from an unexpected website.")


def require_user(request: Request):
    _check_origin(request)
    user = current_user(request)
    if user is None:
        raise AppError(401, "auth_required", "Please log in to do that.")
    return user


def require_craftsperson(request: Request):
    user = require_user(request)
    if user["role"] != "craftsperson":
        raise AppError(403, "craftsperson_only", "Only craftsperson accounts can do that. You can create one by signing up as a Craftsperson.")
    return user


def validate_art_form(value: str | None, required: bool = True) -> str | None:
    v = (value or "").lower().strip()
    if not v:
        if required:
            raise AppError(400, "art_form_required", "Please choose an art form.")
        return None
    if v not in ART_FORMS:
        raise AppError(400, "unknown_art_form", f"Unknown art form. Choose one of: {', '.join(ART_FORMS)}.")
    return v


# ---- routes ----------------------------------------------------------------------------------------------------------
class SignupRequest(BaseModel):
    username: str = ""
    display_name: str = ""
    password: str = ""
    role: str = "learner"
    bio: str = ""
    art_form: str | None = None
    region: str = ""


class LoginRequest(BaseModel):
    username: str = ""
    password: str = ""


class ProfileRequest(BaseModel):
    display_name: str = ""
    bio: str = ""
    art_form: str | None = None
    region: str = ""


auth_limiter = RateLimiter(10)
router = APIRouter(prefix="/api/auth")
people = APIRouter(prefix="/api/craftspeople")


def _limit(request: Request) -> None:
    limiter = getattr(request.app.state, "auth_limiter", auth_limiter)
    wait = limiter.check(request.client.host if request.client else "unknown")
    if wait:
        raise AppError(429, "rate_limited", "Too many attempts. Please wait a minute and try again.", {"Retry-After": str(int(wait))})


def _set_cookie(request: Request, response: Response, user_id: int) -> None:
    s = request.app.state.settings
    response.set_cookie(SESSION_COOKIE, make_token(s.session_secret, user_id, s.session_days), max_age=s.session_days * 86400,
                        httponly=True, samesite="lax", secure=s.cookie_secure, path="/")


@router.post("/signup", status_code=201)
def signup(req: SignupRequest, request: Request, response: Response, _l: None = Depends(_limit)):
    _check_origin(request)
    username = clean(req.username, 190).lower()
    if not USERNAME_RE.match(username):
        raise AppError(400, "invalid_username", "Please use an email-style username, for example name@example.com.")
    display = clean(req.display_name, 40)
    if len(display) < 2:
        raise AppError(400, "invalid_display_name", "Please enter a display name of at least 2 characters.")
    if not 8 <= len(req.password) <= 128:
        raise AppError(400, "invalid_password", "Your password must be between 8 and 128 characters.")
    if req.role not in ROLES:
        raise AppError(400, "invalid_role", "Please choose Learner or Craftsperson.")
    art = validate_art_form(req.art_form, required=req.role == "craftsperson")
    with request.app.state.db.connect() as db:
        if db.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
            raise AppError(409, "username_taken", "That username is already registered. Try logging in instead.")
        cur = db.execute("INSERT INTO users (username, display_name, role, password_hash, bio, art_form, region) VALUES (?,?,?,?,?,?,?)",
                         (username, display, req.role, hash_password(req.password), clean(req.bio, 300), art, clean(req.region, 60)))
        row = db.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    _set_cookie(request, response, row["id"])
    log.info("account created", extra={"user_id": row["id"], "role": row["role"]})
    return {"user": own_user(row), "note": PROFILE_NOTE}


@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response, _l: None = Depends(_limit)):
    _check_origin(request)
    username = clean(req.username, 190).lower()
    with request.app.state.db.connect() as db:
        row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    ok = verify_password(req.password, row["password_hash"] if row else _DUMMY_HASH)
    if not row or not ok:
        raise AppError(401, "invalid_credentials", "That username or password is not correct.")
    _set_cookie(request, response, row["id"])
    return {"user": own_user(row)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    user = current_user(request)
    secret_is_default = request.app.state.settings.session_secret == "dev-only-secret-change-me"
    return {"user": own_user(user) if user else None, "note": PROFILE_NOTE, "dev_secret": secret_is_default}


@router.put("/profile")
def update_profile(req: ProfileRequest, request: Request, user=Depends(require_user)):
    display = clean(req.display_name, 40)
    if len(display) < 2:
        raise AppError(400, "invalid_display_name", "Please enter a display name of at least 2 characters.")
    art = validate_art_form(req.art_form, required=user["role"] == "craftsperson") if user["role"] == "craftsperson" else None
    with request.app.state.db.connect() as db:
        db.execute("UPDATE users SET display_name=?, bio=?, art_form=?, region=? WHERE id=?",
                   (display, clean(req.bio, 300), art, clean(req.region, 60), user["id"]))
        row = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return {"user": own_user(row)}


@people.get("/{person_id}")
def craftsperson(person_id: int, request: Request):
    from .listings import LISTING_SELECT, listing_json
    from .videos import VIDEO_SELECT, video_json

    with request.app.state.db.connect() as db:
        row = db.execute("SELECT * FROM users WHERE id = ? AND role = 'craftsperson'", (person_id,)).fetchone()
        if not row:
            raise AppError(404, "craftsperson_not_found", "We could not find that craftsperson.")
        videos = [video_json(v) for v in db.execute(f"{VIDEO_SELECT} WHERE v.owner_id = ? ORDER BY v.id DESC", (person_id,))]
        listings = [listing_json(db, r) for r in db.execute(f"{LISTING_SELECT} WHERE l.owner_id = ? ORDER BY l.id DESC", (person_id,)).fetchall()]
    return {"craftsperson": public_user(row), "videos": videos, "listings": listings, "note": PROFILE_NOTE}
