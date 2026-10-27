"""Runtime configuration, read from environment variables (see .env.example)."""
import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


DEV_SECRET = "dev-only-secret-change-me"


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


def _load_dotenv() -> None:
    """Minimal .env loader (no extra dependency). Real environment variables win."""
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass
class Settings:
    model_dir: Path = field(default_factory=lambda: ROOT / "backend")
    upload_dir: Path = field(default_factory=lambda: ROOT / "backend" / "uploads")
    dist_dir: Path = field(default_factory=lambda: ROOT / "frontend" / "dist")
    data_dir: Path = field(default_factory=lambda: ROOT / "backend" / "data")
    session_secret: str = DEV_SECRET
    cookie_secure: bool = False
    session_days: int = 7
    upload_ttl_hours: float = 24.0
    max_upload_mb: int = 10
    allowed_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173", "http://localhost:8000"])
    log_level: str = "INFO"
    port: int = 8000
    rate_limit_per_min: int = 20
    max_concurrent_inference: int = 2
    analyze_timeout_s: float = 60.0
    max_pixels: int = 40_000_000
    cleanup_interval_s: float = 600.0
    strict_model_check: bool = False
    frame_ancestors: str = "'none'"
    version: str = "1.1.0"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


def load_settings() -> Settings:
    _load_dotenv()
    env = os.environ.get
    s = Settings()
    if env("MODEL_DIR"):
        s.model_dir = Path(env("MODEL_DIR"))
        if not s.model_dir.is_absolute():
            s.model_dir = ROOT / s.model_dir
    if env("UPLOAD_DIR"):
        s.upload_dir = Path(env("UPLOAD_DIR"))
        if not s.upload_dir.is_absolute():
            s.upload_dir = ROOT / s.upload_dir
    if env("DATA_DIR"):
        s.data_dir = Path(env("DATA_DIR"))
        if not s.data_dir.is_absolute():
            s.data_dir = ROOT / s.data_dir
    s.session_secret = env("SESSION_SECRET", s.session_secret)
    s.cookie_secure = env("COOKIE_SECURE", "0") == "1"
    s.session_days = _int("SESSION_DAYS", s.session_days)
    s.upload_ttl_hours = _float("UPLOAD_TTL_HOURS", s.upload_ttl_hours)
    s.max_upload_mb = _int("MAX_UPLOAD_MB", s.max_upload_mb)
    if env("ALLOWED_ORIGINS"):
        s.allowed_origins = [o.strip() for o in env("ALLOWED_ORIGINS").split(",") if o.strip() and o.strip() != "*"]
    s.log_level = env("LOG_LEVEL", s.log_level).upper()
    s.port = _int("PORT", s.port)
    s.rate_limit_per_min = _int("RATE_LIMIT_PER_MIN", s.rate_limit_per_min)
    s.max_concurrent_inference = _int("MAX_CONCURRENT_INFERENCE", s.max_concurrent_inference)
    s.analyze_timeout_s = _float("ANALYZE_TIMEOUT_S", s.analyze_timeout_s)
    s.cleanup_interval_s = _float("CLEANUP_INTERVAL_S", s.cleanup_interval_s)
    s.strict_model_check = env("STRICT_MODEL_CHECK", "0") == "1"
    s.frame_ancestors = env("FRAME_ANCESTORS", s.frame_ancestors)
    return s
