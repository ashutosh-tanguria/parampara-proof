"""Parampara Proof API. Run from the repository root: uvicorn backend.main:app"""
import asyncio
import contextlib
import contextvars
import json
import logging
import os
import re
import time
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel

from . import auth, listings, messaging, videos
from . import chat as chat_module
from .config import DEV_SECRET, Settings, load_settings
from .db import Database
from .content import AUTOMATED, CATALOGUE, COMMON_MISTAKES, GALLERY, LESSONS, SAMPLE_POSTS, clean_quote, hero_image, load_credits
from .errors import AppError, error_response, install_error_handlers
from .model_service import Knowledge, ModelService, friendly_model_error
from .stores import BoundedStore, RateLimiter
from .uploads import cleanup_uploads, decode_image, downscale, save_upload

log = logging.getLogger("parampara")
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")
ID_RE = re.compile(r"^[0-9a-f]{32}$")
CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)), "level": record.levelname,
                "logger": record.name, "msg": record.getMessage(), "request_id": request_id_var.get()}
        for k in ("method", "path", "status", "ms", "art_form", "inference_ms"):
            if hasattr(record, k):
                data[k] = getattr(record, k)
        if record.exc_info:
            data["exc"] = self.formatException(record.exc_info)
        return json.dumps(data)


def configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger("parampara")
    root.handlers = [handler]
    root.setLevel(level)
    root.propagate = False


class ChatRequest(BaseModel):
    message: str = ""
    art_form: str | None = None


class LikeRequest(BaseModel):
    liked: bool = True


class ArtworkRequest(BaseModel):
    title: str
    art_form: str
    analysis_id: str | None = None


def clean_text(value: str | None, limit: int) -> str:
    return CONTROL_CHARS.sub("", value or "").strip()[:limit]


def create_app(settings: Settings | None = None, service: ModelService | None = None, load_model: bool = True) -> FastAPI:
    """service: use an already-loaded model (tests). load_model=False: start without a model (503 on analyze)."""
    settings = settings or load_settings()
    configure_logging(settings.log_level)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    Image.MAX_IMAGE_PIXELS = settings.max_pixels  # Pillow's own decompression-bomb guard

    analyses = BoundedStore(500)
    posts = BoundedStore(200)
    limiter = RateLimiter(settings.rate_limit_per_min)
    credits: list[dict] = []
    for p in SAMPLE_POSTS:
        posts.put(p["id"], {**p, "artist": "Sample member", "image_url": None, "created_at": "Sample", "likes": 0, "comments": 0, "is_sample": True})

    async def cleanup_loop(app: FastAPI):
        ttl = settings.upload_ttl_hours * 3600
        while True:
            await asyncio.sleep(settings.cleanup_interval_s)
            removed = cleanup_uploads(settings.upload_dir, ttl)
            purged = analyses.purge_older_than(ttl)
            if removed or purged:
                log.info("cleanup removed %d files and %d analyses", removed, purged)

    def build_model() -> ModelService:
        svc = ModelService(settings.model_dir, app.state.knowledge)
        svc.load_clip(min(4, os.cpu_count() or 2))
        return svc

    async def load_model_task(app: FastAPI):
        """Load CLIP and the classifier. Runs in the background so the API (and the content pages) are available
        immediately, even during the first-run download of the CLIP weights."""
        try:
            app.state.model = await run_in_threadpool(build_model)
            app.state.model_state = "ready"
            app.state.model_error = None
            log.info("model ready")
        except Exception as e:
            app.state.model_state = "failed"
            app.state.model_error = friendly_model_error(e)
            log.error("model could not be loaded: %s: %s", type(e).__name__, e, exc_info=True)
            if settings.strict_model_check:
                raise

    @contextlib.asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            app.state.knowledge = Knowledge(settings.model_dir)
            credits.extend(load_credits(settings.model_dir / "image_credits.csv"))
        except Exception as e:
            log.error("content files could not be read from %s: %s", settings.model_dir, e)
            raise RuntimeError(f"Content files are missing or unreadable in {settings.model_dir} ({e}). Is MODEL_DIR correct?") from e
        app.state.model = None
        app.state.model_error = None
        app.state.model_state = "loading"
        app.state.semaphore = asyncio.Semaphore(settings.max_concurrent_inference)
        loader = None
        if service is not None:
            app.state.model, app.state.model_state = service, "ready"
        elif not load_model:
            app.state.model_state, app.state.model_error = "failed", "Model loading is switched off."
        elif settings.strict_model_check:
            await load_model_task(app)  # refuse to start if the model cannot load
        else:
            loader = asyncio.create_task(load_model_task(app))
        task = asyncio.create_task(cleanup_loop(app))
        yield
        task.cancel()
        if loader:
            loader.cancel()

    app = FastAPI(title="Parampara Proof API", description="Style-similarity checker and learning content for Indian folk art.", version=settings.version, lifespan=lifespan)
    install_error_handlers(app)
    app.state.settings = settings
    app.state.analyses = analyses
    app.state.posts = posts
    app.state.db = Database(settings.data_dir / "app.db")
    app.state.auth_limiter = RateLimiter(10)
    if settings.session_secret == DEV_SECRET:
        log.warning("SESSION_SECRET is not set: using the built-in development secret. Fine for a local demo, NOT for a public site.")

    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.middleware("http")
    async def request_middleware(request: Request, call_next):
        rid = request.headers.get("x-request-id", "")[:64] or uuid.uuid4().hex[:12]
        token = request_id_var.set(rid)
        start = time.perf_counter()
        try:
            length = request.headers.get("content-length")
            path = request.url.path
            limit = (videos.MAX_VIDEO_BYTES if path == "/api/videos/upload" else 4 * listings.MAX_IMAGE_BYTES if path.endswith("/images") else settings.max_upload_bytes) + 1024 * 1024
            if request.method == "POST" and length and length.isdigit() and int(length) > limit:
                response = error_response(413, "request_too_large", f"The request is too large (limit about {limit // (1024 * 1024)} MB).")
            else:
                response = await call_next(request)
            h = response.headers
            h["X-Request-ID"] = rid
            h["X-Content-Type-Options"] = "nosniff"
            h["Referrer-Policy"] = "strict-origin-when-cross-origin"
            h["Permissions-Policy"] = "camera=(), geolocation=(), microphone=(self)"
            h["Content-Security-Policy"] = (
                "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; "
                f"font-src 'self' data:; connect-src 'self'; frame-src https://www.youtube-nocookie.com; media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors {settings.frame_ancestors}"
            )
            if request.url.path.startswith("/uploads/"):
                h["Cache-Control"] = "private, max-age=3600"
            log.info("request", extra={"method": request.method, "path": request.url.path, "status": response.status_code, "ms": round((time.perf_counter() - start) * 1000)})
            return response
        finally:
            request_id_var.reset(token)

    def rate_limit(request: Request) -> None:
        wait = limiter.check(request.client.host if request.client else "unknown")
        if wait:
            raise AppError(429, "rate_limited", "Too many requests. Please wait a moment and try again.", {"Retry-After": str(int(wait))})

    def kb() -> dict:
        return app.state.knowledge.kb

    # ---- health and content ---------------------------------------------------------------------------------
    @app.get("/api/health")
    def health():
        svc: ModelService | None = app.state.model
        loaded = svc is not None and svc.ready
        return {
            "status": "ok" if loaded else ("loading" if app.state.model_state == "loading" else "degraded"),
            "version": settings.version,
            "model_loaded": loaded,
            "model_state": app.state.model_state,
            "clip_model": svc.clip_name if svc else None,
            "sklearn_version": svc.meta.get("sklearn_version") if svc else None,
            "classes": [str(c) for c in svc.clf.classes_] if svc else [],
            "model_version": svc.model_version if svc else None,
            "error": None if loaded else (app.state.model_error or "The model is still loading."),
        }

    @app.get("/api/art-forms")
    def art_forms():
        out = []
        for slug, (subtitle, category, image) in CATALOGUE.items():
            info = kb().get(slug)
            if not info:
                continue
            out.append({"slug": slug, "name": info.get("name", slug.capitalize()), "subtitle": subtitle, "category": category, "image_slug": image,
                        "automated_supported": slug in AUTOMATED, "origin": info.get("origin", ""), "quote": clean_quote(info.get("quote")), "overview": info.get("overview", "")})
        return {"art_forms": out}

    @app.get("/api/art-forms/{slug}")
    def art_form_detail(slug: str):
        key = slug.lower().strip()
        info = kb().get(key)
        if not info or key not in CATALOGUE:
            raise AppError(404, "art_form_not_found", f"We could not find an art form called '{clean_text(slug, 40)}'.")
        return {
            "slug": key, "name": info.get("name", key.capitalize()), "image_slug": hero_image(key), "automated_supported": key in AUTOMATED,
            "origin": info.get("origin", ""), "quote": clean_quote(info.get("quote")), "overview": info.get("overview", ""),
            "key_characteristics": info.get("key_characteristics", []), "materials_and_techniques": info.get("materials_and_techniques", []),
            "common_mistakes": info.get("common_mistakes", []), "next_exercise": info.get("next_exercise", ""),
            "gallery": [{"title": t, "image_slug": s} for t, s in GALLERY.get(key, [])],
        }

    @app.get("/api/lessons")
    def lessons():
        exercises, tips = [], []
        for slug in CATALOGUE:
            info = kb().get(slug, {})
            name = info.get("name", slug.capitalize())
            if info.get("next_exercise"):
                exercises.append({"id": f"ex-{slug}", "title": f"Practice exercise: {name}", "art_form": name.split(" ")[0].strip("/"), "steps": info["next_exercise"]})
            for c in info.get("key_characteristics", [])[:2]:
                tips.append({"art_form": name.split(" ")[0].strip("/"), "tip": c.get("tip", "")})
        return {"lessons": [{**le, "status": "coming_soon"} for le in LESSONS], "common_mistakes": COMMON_MISTAKES, "practice_exercises": exercises, "tips": [t for t in tips if t["tip"]]}

    @app.get("/api/credits")
    def credits_endpoint():
        return {"credits": credits, "note": (
            f"{len(credits)} images were collected from Wikimedia Commons for training. The cleaned training set used 132 of them; "
            "the list does not record which. Attribution is required for CC BY and CC BY-SA licences.")}

    # ---- analysis -------------------------------------------------------------------------------------------
    @app.post("/api/analyze")
    async def analyze(request: Request, image: UploadFile = File(...), art_form: str = Form(""), user_note: str | None = Form(None),
                      language: str | None = Form("English"), _rl: None = Depends(rate_limit)):
        art = art_form.lower().strip()
        if not art:
            raise AppError(400, "art_form_required", "Please choose an art form.")
        if art not in CATALOGUE:
            raise AppError(400, "unknown_art_form", f"Unknown art form. Choose one of: {', '.join(CATALOGUE)}.")
        data = await image.read(settings.max_upload_bytes + 1)
        im = await run_in_threadpool(decode_image, data, settings.max_upload_bytes, settings.max_pixels)

        svc: ModelService | None = app.state.model
        if svc is None or not svc.ready:
            if app.state.model_state == "loading":
                raise AppError(503, "model_loading", "The model is still loading (the first start can download about 600 MB). Please try again in a minute.", {"Retry-After": "15"})
            raise AppError(503, "model_unavailable", f"Analysis is temporarily unavailable. {app.state.model_error or ''}".strip())
        im = downscale(im)
        note = clean_text(user_note, 500) or None
        t0 = time.perf_counter()
        try:
            async with app.state.semaphore:
                result = await asyncio.wait_for(run_in_threadpool(svc.analyze_image, im, art, note), timeout=settings.analyze_timeout_s)
        except asyncio.TimeoutError:
            raise AppError(504, "timeout", "The analysis took too long. Please try again.") from None
        log.info("analysis done", extra={"art_form": art, "inference_ms": round((time.perf_counter() - t0) * 1000)})

        file_id, name = await run_in_threadpool(save_upload, im, settings.upload_dir)
        result["id"] = file_id
        result["image_url"] = f"/uploads/{name}"
        result["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        analyses.put(file_id, result)
        return result

    @app.get("/api/analysis/{analysis_id}")
    def get_analysis(analysis_id: str):
        record = analyses.get(analysis_id) if ID_RE.match(analysis_id) else None
        if not record:
            raise AppError(404, "analysis_not_found", "We could not find this analysis. It may have expired (results are deleted after 24 hours).")
        return record

    # ---- chat -----------------------------------------------------------------------------------------------
    @app.post("/api/chat")
    def chat(req: ChatRequest, _rl: None = Depends(rate_limit)):
        return chat_module.reply(kb(), req.message, req.art_form)

    # ---- community and portfolio ----------------------------------------------------------------------------
    @app.get("/api/community")
    def community():
        return {"artworks": posts.values()}

    @app.post("/api/community/{post_id}/like")
    def like(post_id: str, body: LikeRequest | None = None):
        delta = 1 if body is None or body.liked else -1
        updated = posts.update(post_id, lambda p: {**p, "likes": max(0, p["likes"] + delta)})
        if not updated:
            raise AppError(404, "post_not_found", "That post no longer exists.")
        return {"id": post_id, "likes": updated["likes"]}

    @app.post("/api/artworks", status_code=201)
    def share_artwork(req: ArtworkRequest):
        title = clean_text(req.title, 80)
        if len(title) < 3:
            raise AppError(400, "invalid_title", "Please enter a title of at least 3 characters.")
        art = req.art_form.lower().strip()
        if art not in CATALOGUE:
            raise AppError(400, "unknown_art_form", "Please choose a valid art form.")
        image_url = None
        if req.analysis_id:
            record = analyses.get(req.analysis_id) if ID_RE.match(req.analysis_id) else None
            if not record:
                raise AppError(400, "analysis_not_found", "That analysis has expired, so its image cannot be attached.")
            image_url = record["image_url"]
        post = {"id": f"user-{uuid.uuid4().hex[:8]}", "title": title, "art_form": art, "artist": "Guest", "image_slug": None if image_url else hero_image(art),
                "image_url": image_url, "created_at": "Just now", "likes": 0, "comments": 0, "is_sample": False}
        posts.put(post["id"], post)
        return post

    @app.get("/api/portfolio")
    def portfolio():
        # History is kept in the visitor's browser; the server never lists other people's analyses.
        return {"user": {"name": "Guest", "bio": "Guest profile. Your history and saved items are stored in this browser only."}, "storage": "browser"}

    app.include_router(auth.router)
    app.include_router(auth.people)
    app.include_router(videos.router)
    app.include_router(listings.router)
    app.include_router(messaging.router)
    (settings.data_dir / "uploads").mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.data_dir / "uploads"), name="media")  # videos and listing images
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
    _mount_spa(app, settings.dist_dir)
    return app


def _mount_spa(app: FastAPI, dist: Path) -> None:
    """Serve the built frontend with SPA fallback. API and file-like paths that do not exist return JSON 404."""
    if not (dist / "index.html").exists():
        return
    dist = dist.resolve()

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith(("api/", "uploads/", "media/")):
            raise AppError(404, "not_found", "Not found.")
        candidate = (dist / full_path).resolve()
        try:
            candidate.relative_to(dist)  # blocks ../ path traversal
        except ValueError:
            return JSONResponse({"error": {"code": "not_found", "message": "Not found."}}, status_code=404)
        if candidate.is_file():
            return FileResponse(candidate)
        if "." in Path(full_path).name:  # a missing asset, not an app route
            return JSONResponse({"error": {"code": "not_found", "message": "Not found."}}, status_code=404)
        return FileResponse(dist / "index.html")


app = create_app()
