import sys
import os

# Adiciona o diretório backend ao path para importar server.py
# Funciona tanto localmente quanto no ambiente serverless da Vercel
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
sys.path.insert(0, os.path.normpath(backend_path))

from server import app  # noqa: E402,F401 — exporta o app FastAPI para a Vercel
