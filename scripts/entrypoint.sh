#!/bin/bash
set -e

echo "→ Seeding demo study..."
python -m backend.seed_demo || echo "Seed skipped (already exists or error)"

echo "→ Starting Paraverse on port ${PORT:-8080}..."
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8080}"
