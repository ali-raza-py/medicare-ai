from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency for local dev
    load_dotenv = None


def _load_environment() -> None:
    candidate_paths = [
        Path.cwd() / '.env',
        Path(__file__).resolve().parents[2] / '.env',
    ]

    for env_path in candidate_paths:
        if not env_path.exists():
            continue

        if load_dotenv is not None:
            load_dotenv(env_path, override=False)
            return

        with env_path.open('r', encoding='utf-8') as handle:
            for line in handle:
                stripped = line.strip()
                if not stripped or stripped.startswith('#') or '=' not in stripped:
                    continue
                key, value = stripped.split('=', 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return


_load_environment()


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
    supabase_url: str | None = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_anon_key: str | None = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    supabase_service_key: str | None = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


settings = Settings()


def validate_runtime_config() -> None:
    """Fail fast when production would silently lose data or auth safety."""
    if settings.environment.lower() in {'development', 'test'}:
        return

    missing = []
    if not settings.supabase_url:
        missing.append('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL')
    if not settings.supabase_anon_key:
        missing.append('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY')
    if not settings.supabase_service_key:
        missing.append('SUPABASE_SERVICE_ROLE_KEY')
    if not settings.allowed_origins or any('localhost' in origin or '127.0.0.1' in origin for origin in settings.allowed_origins):
        missing.append('CORS_ALLOWED_ORIGINS with production frontend origins')
    if missing:
        raise RuntimeError(
            'Production configuration is incomplete. Set: ' + ', '.join(missing) + '.'
        )
