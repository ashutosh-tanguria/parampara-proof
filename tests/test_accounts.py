"""Auth hashing, session tokens and the video / listing-image upload checks (no CLIP model needed)."""
import io
import time

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend import listings, videos
from backend.auth import hash_password, make_token, read_token, verify_password
from backend.main import create_app

PW = "correct horse battery"
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
WEBM = b"\x1a\x45\xdf\xa3" + b"\x42\x82\x84webm" + b"\x00" * 64


@pytest.fixture()
def api(settings):
    with TestClient(create_app(settings, load_model=False)) as c:
        yield c


def signup(c, name="a@example.com", role="craftsperson", **extra):
    body = {"username": name, "display_name": "Test Person", "password": PW, "role": role, "art_form": "warli" if role == "craftsperson" else None, **extra}
    return c.post("/api/auth/signup", json=body)


def jpeg(size=(120, 90)):
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 80, 40)).save(buf, "JPEG")
    return buf.getvalue()


# ---- hashing and tokens ----------------------------------------------------------------------------------------
def test_password_hash_format_and_verify():
    h = hash_password(PW)
    assert h.startswith("scrypt$") and PW not in h
    assert verify_password(PW, h) and not verify_password(PW + "x", h)
    assert hash_password(PW) != h  # random salt
    assert not verify_password(PW, "") and not verify_password(PW, "scrypt$bad") and not verify_password(PW, "md5$1$2$3$4$5")


def test_token_roundtrip_tamper_expiry_and_wrong_secret():
    t = make_token("s1", 7, 1)
    assert read_token("s1", t) == 7
    assert read_token("s2", t) is None
    assert read_token("s1", t[:-2] + "xx") is None
    assert read_token("s1", "garbage") is None and read_token("s1", None) is None
    assert read_token("s1", make_token("s1", 7, 1, now=time.time() - 3 * 86400)) is None


def test_signup_never_stores_plain_password(api, settings):
    assert signup(api).status_code == 201
    assert PW.encode() not in (settings.data_dir / "app.db").read_bytes()
    cookie = api.cookies.get("pp_session")
    assert cookie and PW not in cookie


def test_login_logout_me_and_roles(api):
    r = signup(api)
    assert r.status_code == 201 and "httponly" in r.headers["set-cookie"].lower() and "samesite=lax" in r.headers["set-cookie"].lower()
    assert api.get("/api/auth/me").json()["user"]["role"] == "craftsperson"
    api.post("/api/auth/logout")
    assert api.get("/api/auth/me").json()["user"] is None
    bad_pw = api.post("/api/auth/login", json={"username": "a@example.com", "password": "wrong-password"})
    no_user = api.post("/api/auth/login", json={"username": "nobody@example.com", "password": "wrong-password"})
    assert bad_pw.status_code == no_user.status_code == 401 and bad_pw.json() == no_user.json()  # no user enumeration
    assert api.post("/api/auth/login", json={"username": "A@Example.com", "password": PW}).status_code == 200
    assert signup(api).status_code == 409


def test_signup_validation(api):
    assert signup(api, name="not-an-email").json()["error"]["code"] == "invalid_username"
    assert api.post("/api/auth/signup", json={"username": "b@example.com", "display_name": "B", "password": PW}).json()["error"]["code"] == "invalid_display_name"
    assert api.post("/api/auth/signup", json={"username": "b@example.com", "display_name": "Bee", "password": "short"}).json()["error"]["code"] == "invalid_password"
    assert api.post("/api/auth/signup", json={"username": "b@example.com", "display_name": "Bee", "password": PW, "role": "craftsperson"}).json()["error"]["code"] == "art_form_required"


def test_login_is_required_and_learners_cannot_post(api):
    assert api.post("/api/videos", json={}).status_code == 401
    assert api.post("/api/conversations", json={"to_user_id": 1}).status_code == 401
    signup(api, role="learner")
    r = api.post("/api/videos", json={"title": "My lesson", "art_form": "warli", "level": "Beginner", "youtube_url": "https://youtu.be/dQw4w9WgXcQ"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "craftsperson_only"


# ---- video upload validation ---------------------------------------------------------------------------------------
def upload_video(c, data, name="lesson.mp4", **fields):
    form = {"title": "A lesson", "description": "d", "art_form": "warli", "level": "Beginner", **fields}
    return c.post("/api/videos/upload", files={"file": (name, data, "video/mp4")}, data=form)


def test_video_upload_checks_content_type_and_size(api, settings, monkeypatch):
    signup(api)
    assert upload_video(api, b"just text, not a video").json()["error"]["code"] == "unsupported_video_type"
    assert upload_video(api, MP4, name="lesson.exe").json()["error"]["code"] == "unsupported_video_type"  # name must match content
    assert upload_video(api, WEBM, name="lesson.mp4").json()["error"]["code"] == "unsupported_video_type"
    assert upload_video(api, b"", name="e.mp4").json()["error"]["code"] == "empty_file"
    assert upload_video(api, MP4, level="Expert").json()["error"]["code"] == "invalid_level"
    ok = upload_video(api, MP4)
    assert ok.status_code == 201 and ok.json()["kind"] == "upload" and ok.json()["file_url"].endswith(".mp4")
    assert upload_video(api, WEBM, name="x.webm").status_code == 201
    stored = list((settings.data_dir / "uploads" / "videos").iterdir())
    assert len(stored) == 2 and all(p.name[:32].isalnum() for p in stored)  # random names
    assert api.get(ok.json()["file_url"]).status_code == 200
    monkeypatch.setattr(videos, "MAX_VIDEO_BYTES", 1000)
    big = upload_video(api, MP4 + b"\x00" * 5000)
    assert big.status_code == 400 and big.json()["error"]["code"] == "file_too_large"
    assert len(list((settings.data_dir / "uploads" / "videos").iterdir())) == 2  # the partial file was removed


def test_youtube_links():
    for url in ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://youtube.com/shorts/dQw4w9WgXcQ"):
        assert videos.parse_youtube(url) == "dQw4w9WgXcQ"
    for url in ("https://evil.example/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "https://www.youtube.com/watch?v=short", "not a url", ""):
        with pytest.raises(Exception) as e:
            videos.parse_youtube(url)
        assert getattr(e.value, "status", None) == 400


def test_only_the_owner_can_edit_or_delete_a_video(api):
    signup(api, "owner@example.com")
    vid = api.post("/api/videos", json={"title": "Mine", "art_form": "warli", "level": "Beginner", "youtube_url": "https://youtu.be/dQw4w9WgXcQ"}).json()["id"]
    api.post("/api/auth/logout")
    signup(api, "other@example.com")
    body = {"title": "Hijack", "art_form": "warli", "level": "Beginner"}
    assert api.put(f"/api/videos/{vid}", json=body).json()["error"]["code"] == "not_owner"
    assert api.delete(f"/api/videos/{vid}").status_code == 403
    assert api.get(f"/api/videos/{vid}").json()["video"]["title"] == "Mine"


# ---- listing image validation -----------------------------------------------------------------------------------
def make_listing(c):
    r = c.post("/api/listings", json={"title": "A panel", "description": "d", "art_form": "warli", "price_inr": 2500})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def put_images(c, lid, *blobs, names=None):
    files = [("files", ((names or [f"i{n}.jpg" for n in range(len(blobs))])[n], b, "image/jpeg")) for n, b in enumerate(blobs)]
    return c.post(f"/api/listings/{lid}/images", files=files)


def test_listing_images_are_checked_by_content_and_size(api, settings, monkeypatch):
    signup(api)
    lid = make_listing(api)
    assert put_images(api, lid, b"not an image at all", names=["x.jpg"]).json()["error"]["code"] == "unsupported_type"
    assert put_images(api, lid, jpeg()[:200]).json()["error"]["code"] == "unreadable_image"
    ok = put_images(api, lid, jpeg(), jpeg((200, 150)))
    assert ok.status_code == 201 and len(ok.json()["images"]) == 2
    assert api.get(ok.json()["images"][0]).headers["content-type"] == "image/jpeg"
    assert put_images(api, lid, jpeg(), jpeg(), jpeg()).json()["error"]["code"] == "too_many_images"  # 2 + 3 > 4
    assert put_images(api, lid, jpeg(), jpeg()).status_code == 201  # exactly 4 in total
    assert put_images(api, lid, jpeg()).json()["error"]["code"] == "too_many_images"
    lid2 = make_listing(api)
    monkeypatch.setattr(listings, "MAX_IMAGE_BYTES", 500)
    assert put_images(api, lid2, jpeg((600, 600))).json()["error"]["code"] == "file_too_large"
    assert len(list((settings.data_dir / "uploads" / "listings").iterdir())) == 4  # nothing left from rejected uploads


def test_listing_validation_and_no_checkout_or_verified_claims(api):
    signup(api)
    assert api.post("/api/listings", json={"title": "A panel", "art_form": "warli", "price_inr": 0}).json()["error"]["code"] == "invalid_price"
    lid = make_listing(api)
    body = api.get(f"/api/listings/{lid}").json()
    text = str(body).lower()
    assert "demo marketplace. no payments are taken" in text
    for banned in ("verified badge", "authentic", "buy now", "checkout"):
        assert banned not in text.replace("listings are not verified", "").replace("authenticity checks", "")


# ---- messages ------------------------------------------------------------------------------------------------------
def test_messages_are_plain_text_limited_and_private(api):
    signup(api, "teacher@example.com")
    teacher = api.get("/api/auth/me").json()["user"]["id"]
    api.post("/api/auth/logout")
    signup(api, "learner@example.com", role="learner")
    conv = api.post("/api/conversations", json={"to_user_id": teacher}).json()["id"]
    xss = '<img src=x onerror=alert(1)><script>alert(2)</script>'
    sent = api.post(f"/api/conversations/{conv}/messages", json={"body": xss + "\x00"})
    assert sent.status_code == 201 and sent.json()["body"] == xss  # stored and returned as literal text (the UI never uses innerHTML)
    assert api.post(f"/api/conversations/{conv}/messages", json={"body": "x" * 1001}).json()["error"]["code"] == "message_too_long"
    assert api.post(f"/api/conversations/{conv}/messages", json={"body": "   "}).json()["error"]["code"] == "empty_message"
    api.post("/api/auth/logout")
    signup(api, "stranger@example.com", role="learner")
    assert api.get(f"/api/conversations/{conv}/messages").status_code == 404  # not a participant
    api.post("/api/auth/logout")
    api.post("/api/auth/login", json={"username": "teacher@example.com", "password": PW})
    assert api.get("/api/conversations/unread-count").json()["unread"] == 1
    api.post(f"/api/conversations/{conv}/read")
    assert api.get("/api/conversations/unread-count").json()["unread"] == 0
