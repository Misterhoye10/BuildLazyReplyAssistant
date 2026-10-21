import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in backend/ or root
backend_dir = Path(__file__).resolve().parent
root_dir = backend_dir.parent

load_dotenv(backend_dir / ".env")
load_dotenv(root_dir / ".env")

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    AI_API_BASE = os.getenv("AI_API_BASE", "https://api.groq.com/openai/v1")
    PORT = int(os.getenv("PORT", 5000))
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
    MAX_MESSAGE_LENGTH = 4000
    ALLOWED_TONES = ["friendly", "professional", "brief"]
    REQUEST_TIMEOUT = 25  # seconds
