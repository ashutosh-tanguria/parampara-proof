"""Small thread-safe, bounded in-memory stores and a per-IP rate limiter."""
import threading
import time
from collections import OrderedDict, deque
from typing import Any, Callable


class BoundedStore:
    """Insertion-ordered dict with a maximum size (oldest entries are evicted) and optional TTL."""

    def __init__(self, max_items: int):
        self._max = max_items
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.RLock()

    def put(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = (time.time(), value)
            self._data.move_to_end(key)
            while len(self._data) > self._max:
                self._data.popitem(last=False)

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._data.get(key)
            return item[1] if item else None

    def update(self, key: str, fn: Callable[[Any], Any]) -> Any | None:
        with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            item = (item[0], fn(item[1]))
            self._data[key] = item
            return item[1]

    def values(self) -> list[Any]:
        with self._lock:
            return [v for _, v in reversed(self._data.values())]

    def purge_older_than(self, seconds: float, now: float | None = None) -> int:
        now = now if now is not None else time.time()
        with self._lock:
            stale = [k for k, (t, _) in self._data.items() if now - t > seconds]
            for k in stale:
                del self._data[k]
            return len(stale)

    def __len__(self) -> int:
        with self._lock:
            return len(self._data)


class RateLimiter:
    """Sliding one-minute window per key. limit <= 0 disables it."""

    def __init__(self, limit_per_min: int):
        self.limit = limit_per_min
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, now: float | None = None) -> float:
        """Returns 0 if allowed, otherwise the number of seconds to wait."""
        if self.limit <= 0:
            return 0.0
        now = now if now is not None else time.monotonic()
        with self._lock:
            q = self._hits.setdefault(key, deque())
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= self.limit:
                return max(1.0, 60 - (now - q[0]))
            q.append(now)
            if len(self._hits) > 5000:  # bound memory under many distinct IPs
                for k in [k for k, v in self._hits.items() if not v or now - v[-1] > 60]:
                    del self._hits[k]
            return 0.0
