# ── Stage 1: build React frontend ──────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ─────────────────────────────────────────────────────
FROM python:3.11-slim

# System deps for Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
      wget curl gnupg ca-certificates \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
      libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
      libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 \
      libglib2.0-0 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium
RUN playwright install chromium

# Copy backend
COPY backend/ ./backend/
COPY calibration_seeds/ ./calibration_seeds/
COPY backend/seed_demo.py ./backend/seed_demo.py

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Data dir (SQLite + screenshots live here; ephemeral on Cloud Run)
RUN mkdir -p data/screenshots

# Seed the demo study at startup
COPY scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PORT=8080
EXPOSE 8080

CMD ["./entrypoint.sh"]
