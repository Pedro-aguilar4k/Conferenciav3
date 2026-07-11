#!/usr/bin/env bash
set -a
[ -f ./.env.development.local ] && . ./.env.development.local
set +a
cd backend
exec ../.venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
