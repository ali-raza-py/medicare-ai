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


def ensure_jwt_configured(environment: str, jwt_secret: str | None) -> None:
    """Refuse to run in a non-development environment without a JWT signing
    secret. Signature verification is mandatory: starting without a secret
    would leave medical data reachable with attacker-forged tokens, so the
    application fails fast at startup instead of running insecurely."""
    if jwt_secret:
        return
    if environment == 'development':
        logger.error(
            'MEDICARE_JWT_SECRET is not set — signature verification is '
            'impossible and all authenticated requests will be rejected. '
            'Set MEDICARE_JWT_SECRET before deploying.'
        )
        return
    raise RuntimeError(
        'MEDICARE_JWT_SECRET is not set. JWT signature verification is '
        'mandatory; refusing to start with insecure authentication '
        'configuration.'
    )


def get_auth_user(
    authorization: Annotated[str | None, Header(required=False)] = None,
) -> AuthUser:
    """Validate a Supabase JWT from the Authorization header and return the
    authenticated user's identity (sub + email).

    Supabase issues HS256 JWTs signed with the project's JWT secret. The same
    secret is shared with the frontend via NEXT_PUBLIC_SUPABASE_* env vars when
    the backend and frontend belong to the same Supabase project, so the backend
    can verify tokens produced by the frontend's auth flow.

    Signature verification is mandatory. If no secret is configured the
    request fails closed — a token is NEVER accepted without verifying its
    signature, regardless of environment.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Unauthorized')

    try:
        scheme, token = authorization.split(' ', 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authorization header')

    if scheme.lower() != 'bearer':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authorization scheme')

    if not settings.jwt_secret:
        # Fail closed: without the signing secret no token can be trusted.
        logger.error(
            'MEDICARE_JWT_SECRET is not set — rejecting request without '
            'signature verification.'
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Authentication is unavailable: server signing key is not configured',
        )

    try:
        # Supabase access tokens carry an 'aud' claim (e.g. "authenticated").
        # PyJWT >= 2.10 rejects tokens that have an 'aud' claim when no
        # audience is passed to decode(), so audience verification is
        # disabled explicitly: authorization here is based on 'sub'/'email',
        # never on the audience claim. Signature and expiry verification are
        # always enforced (HS256 only, so 'alg: none' tokens are rejected).
        payload = decode(
            token,
            settings.jwt_secret,
            algorithms=['HS256'],
            options={'require': ['sub'], 'verify_aud': False},
        )
    except PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

    email = payload.get('email')
    aud = payload.get('aud')

    return AuthUser(sub=str(payload['sub']), email=email if isinstance(email, str) else None, aud=aud if isinstance(aud, str) else None)
