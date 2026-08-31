"""Vercel serverless entry point for the FastAPI backend.

The @vercel/python builder exposes the ASGI application defined in this
module. All requests matching /api/* are rewritten to this function by
vercel.json, and FastAPI routes them via its own /api/... route prefixes.
"""

from __future__ import annotations

import os
import sys

# Ensure the repository root (which contains the `backend` package) is
# importable from inside the Lambda task root.
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.app.main import app  # noqa: E402,F401
