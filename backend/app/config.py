from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = "medicare-ai-backend"
    environment: str = os.getenv("MEDICARE_ENV", "development")
    api_base_url: str = os.getenv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000")
    allowed_origins: list[str] = field(default_factory=lambda: os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","))
    ai_provider: str = os.getenv("MEDICARE_AI_PROVIDER", "mock")
    ai_model: str = os.getenv("MEDICARE_AI_MODEL", "mock-model")
    ai_api_key: str | None = os.getenv("MEDICARE_AI_API_KEY")
    upload_dir: str = os.getenv("MEDICARE_UPLOAD_DIR", "./.uploads")
    jwt_secret: str | None = os.getenv("MEDICARE_JWT_SECRET")


settings = Settings()
