from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from jwt import PyJWTError, decode

from backend.app.config import settings

logger = logging.getLogger(__name__)


class AuthUser(BaseModel):
    sub: str
    email: str | None = None
    aud: str | None = None


def get_auth_user(
    authorization: Annotated[str | None, Header(required=False)] = None,
) -> AuthUser:
    """Validate a Supabase JWT from the Authorization header and return the
    authenticated user's identity (sub + email).

    Supabase issues HS256 JWTs signed with the project's JWT secret. The same
    secret is shared with the frontend via NEXT_PUBLIC_SUPABASE_* env vars when
    the backend and frontend belong to the same Supabase project, so the backend
    can verify tokens produced by the frontend's auth flow.

    Tokens are optional in this project's current dev posture: endpoints that
    require a user call this dependency explicitly. Endpoints left public keep
    their existing behaviour for tests and local development.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Unauthorized')

    try:
        scheme, token = authorization.split(' ', 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authorization header')

    if scheme.lower() != 'bearer':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authorization scheme')

    # When the JWT secret is configured, verify the token signature.
    # In development without a secret, decode without verification as a
    # temporary fallback so the app remains usable.
    if settings.jwt_secret:
        try:
            payload = decode(token, settings.jwt_secret, algorithms=['HS256'], options={'require': ['sub']})
        except PyJWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
    else:
        logger.warning(
            'MEDICARE_JWT_SECRET is not set — decoding Supabase token without '
            'signature verification. Set MEDICARE_JWT_SECRET for production use.'
        )
        try:
            payload = decode(
                token,
                options={'verify_signature': False, 'require': ['sub']},
                algorithms=['HS256'],
            )
        except PyJWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

    email = payload.get('email')
    aud = payload.get('aud')

    return AuthUser(sub=str(payload['sub']), email=email if isinstance(email, str) else None, aud=aud if isinstance(aud, str) else None)
