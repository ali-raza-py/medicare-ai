"""Supabase integration service — handles document persistence and file storage.

Operates in two modes:
  1. Service-role mode (preferred): uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
  2. User-token mode: accepts a per-request JWT from the authenticated frontend user.

If neither is available, operations silently no-op so the in-memory store remains
the source of truth (graceful degradation).
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

try:
    from supabase import Client, create_client as _create_client
except ImportError:
    _create_client = None  # type: ignore[assignment]
    Client = None  # type: ignore[assignment,misc]

_SUPABASE_URL: str | None = None
_SUPABASE_SERVICE_KEY: str | None = None
_SUPABASE_ANON_KEY: str | None = None
_service_client: Any | None = None


def configure(url: str | None, service_key: str | None, anon_key: str | None) -> None:
    """Initialise module-level Supabase settings. Called once at backend startup."""
    global _SUPABASE_URL, _SUPABASE_SERVICE_KEY, _SUPABASE_ANON_KEY, _service_client
    _SUPABASE_URL = url or None
    _SUPABASE_SERVICE_KEY = service_key or None
    _SUPABASE_ANON_KEY = anon_key or None
    _service_client = None

    if _SUPABASE_URL and _SUPABASE_SERVICE_KEY and _create_client:
        try:
            _service_client = _create_client(_SUPABASE_URL, _SUPABASE_SERVICE_KEY)
            logger.info('Supabase service client initialised (service-role mode)')
        except Exception as exc:
            logger.warning('Failed to initialise Supabase service client: %s', exc)
            _service_client = None


def is_available() -> bool:
    """Return True when at least one Supabase client mode is usable."""
    return bool(_SUPABASE_URL and (_SUPABASE_SERVICE_KEY or _SUPABASE_ANON_KEY) and _create_client)


def _get_client(user_token: str | None = None) -> Any | None:
    """Return the best available Supabase client for the current context."""
    if not _SUPABASE_URL or not _create_client:
        return None

    # Prefer service-role client (bypasses RLS)
    if _service_client is not None:
        return _service_client

    # Fall back to user-authenticated client
    key = _SUPABASE_ANON_KEY or _SUPABASE_SERVICE_KEY
    if not key:
        return None

    try:
        client = _create_client(_SUPABASE_URL, key)
        if user_token:
            client.auth.set_session(user_token, user_token)
        return client
    except Exception as exc:
        logger.warning('Failed to create Supabase client: %s', exc)
        return None


def get_user_id_from_token(user_token: str | None) -> str | None:
    """Extract the authenticated user's UUID from a Supabase session token."""
    if not user_token or not _SUPABASE_URL or not _create_client:
        return None
    key = _SUPABASE_ANON_KEY or _SUPABASE_SERVICE_KEY
    if not key:
        return None
    try:
        client = _create_client(_SUPABASE_URL, key)
        client.auth.set_session(user_token, user_token)
        user_response = client.auth.get_user(user_token)
        if user_response and user_response.user:
            return str(user_response.user.id)
    except Exception as exc:
        logger.warning('Failed to extract user ID from token: %s', exc)
    return None


# ── Document CRUD ────────────────────────────────────────────────────────


def save_document(
    *,
    user_id: str | None,
    document_id: str,
    file_name: str,
    document_type: str,
    extracted_text: str = '',
    processing_status: str = 'processed',
    storage_path: str | None = None,
    user_token: str | None = None,
) -> dict[str, Any] | None:
    """Insert or update a document record in the Supabase `documents` table."""
    client = _get_client(user_token)
    if not client:
        return None

    try:
        row: dict[str, Any] = {
            'id': document_id,
            'file_name': file_name,
            'document_type': document_type,
            'extracted_text': extracted_text,
            'processing_status': processing_status,
        }
        if user_id:
            row['user_id'] = user_id
        if storage_path:
            row['storage_path'] = storage_path

        # Use upsert so re-processing updates the existing row. Note: without a
        # Prefer: return=representation header the response carries no data, so
        # success is "no exception raised" rather than a non-empty result.
        client.table('documents').upsert(row, on_conflict='id').execute()
        return {'id': document_id}
    except Exception as exc:
        logger.warning('Supabase save_document failed: %s', exc)
        return None


def get_document_record(
    document_id: str,
    *,
    user_token: str | None = None,
) -> dict[str, Any] | None:
    """Fetch a single document by its UUID from Supabase."""
    client = _get_client(user_token)
    if not client:
        return None

    try:
        result = client.table('documents').select('*').eq('id', document_id).limit(1).execute()
        return result.data[0] if result.data else None
    except Exception as exc:
        logger.warning('Supabase get_document_record failed: %s', exc)
        return None


def list_user_documents(
    *,
    user_id: str | None = None,
    user_token: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Return all documents visible to the current user."""
    client = _get_client(user_token)
    if not client:
        return []

    try:
        query = client.table('documents').select('*')
        if user_id:
            query = query.eq('user_id', user_id)
        result = query.order('created_at', desc=True).limit(limit).execute()
        return result.data or []
    except Exception as exc:
        logger.warning('Supabase list_user_documents failed: %s', exc)
        return []


# ── Storage ──────────────────────────────────────────────────────────────


def upload_file_to_storage(
    file_bytes: bytes,
    storage_path: str,
    content_type: str = 'application/octet-stream',
    *,
    user_token: str | None = None,
) -> bool:
    """Upload raw file bytes to Supabase Storage."""
    client = _get_client(user_token)
    if not client:
        return False

    try:
        client.storage.from_('medical-documents').upload(
            path=storage_path,
            file=file_bytes,
            file_options={
                'content-type': content_type,
                'upsert': 'true',
            },
        )
        return True
    except Exception as exc:
        logger.warning('Supabase storage upload failed: %s', exc)
        return False


def get_file_url(storage_path: str, *, user_token: str | None = None) -> str | None:
    """Return a signed/public URL for a file in Supabase Storage."""
    client = _get_client(user_token)
    if not client:
        return None

    try:
        url = client.storage.from_('medical-documents').get_public_url(storage_path)
        return url
    except Exception as exc:
        logger.warning('Supabase get_file_url failed: %s', exc)
        return None
