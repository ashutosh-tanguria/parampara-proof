# Stage 1: build the frontend
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: slim Python image with CPU-only PyTorch and the CLIP weights baked in
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/opt/hf-cache
WORKDIR /app

COPY requirements.txt ./
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install -r requirements.txt

COPY backend ./backend
COPY scripts ./scripts
# Fail the build if the model files were changed, then fetch CLIP (about 600 MB) once, at build time.
RUN python scripts/verify_model.py && python scripts/download_model.py

COPY --from=frontend /app/frontend/dist ./frontend/dist

# From here on the container needs no network access.
ENV HF_HUB_OFFLINE=1 STRICT_MODEL_CHECK=1 PORT=8000 UPLOAD_DIR=/data/uploads ALLOWED_ORIGINS=http://localhost:8000
RUN useradd --create-home app && mkdir -p /data/uploads && chown -R app /data /opt/hf-cache
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health').status == 200 else 1)"
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
