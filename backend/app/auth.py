from __future__ import annotations

import logging
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from jwt import PyJWTError, decode

import httpx

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


def _verify_via_supabase(token: str) -> AuthUser | None:
    """Ask Supabase itself whether the access token is valid.

    This does not require the project's JWT signing secret: Supabase checks
    the signature and expiry server-side and returns the owning user. Used
    as the primary/fallback verification path so the backend works even when
    MEDICARE_JWT_SECRET is not set to the Supabase JWT secret."""
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                'Authorization': f'Bearer {token}',
                'apikey': settings.supabase_anon_key,
            },
            timeout=10.0,
        )
    except httpx.HTTPError:
        logger.error('Supabase token verification request failed')
        return None
    if response.status_code != 200:
        return None
    user = response.json()
    sub = user.get('id')
    if not sub:
        return None
    email = user.get('email')
    return AuthUser(
        sub=str(sub),
        email=email if isinstance(email, str) else None,
        aud='authenticated',
    )


def get_auth_user(
    authorization: Annotated[str | None, Header(required=False)] = None,
) -> AuthUser:
    """Validate a Supabase JWT from the Authorization header and return the
    authenticated user's identity (sub + email).

    Verification order:
    1. Local HS256 signature check with MEDICARE_JWT_SECRET (fast path; works
       when the secret matches the Supabase project JWT secret).
    2. Remote verification against Supabase's /auth/v1/user endpoint, which
       needs no shared secret at all.
    A token is NEVER accepted without one of these checks succeeding.
    """
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Unauthorized')

    try:
        scheme, token = authorization.split(' ', 1)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authorization header')

    if scheme.lower() != 'bearer':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid authorization scheme')

    if settings.jwt_secret:
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
            payload = None
        if payload is not None:
            email = payload.get('email')
            aud = payload.get('aud')
            return AuthUser(sub=str(payload['sub']), email=email if isinstance(email, str) else None, aud=aud if isinstance(aud, str) else None)
    else:
        logger.error(
            'MEDICARE_JWT_SECRET is not set — falling back to remote '
            'Supabase token verification.'
        )

    user = _verify_via_supabase(token)
    if user is not None:
        return user

    if not settings.jwt_secret and not (settings.supabase_url and settings.supabase_anon_key):
        # Fail closed: no verification mechanism available at all.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Authentication is unavailable: server signing key is not configured',
        )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')
