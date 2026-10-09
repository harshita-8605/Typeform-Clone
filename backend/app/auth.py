import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv

from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)
load_dotenv()
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env.local")


def get_creator_email(
    credentials: HTTPAuthorizationCredentials | None,
) -> str:
    secret = os.getenv("BACKEND_AUTH_SECRET") or os.getenv("NEXTAUTH_SECRET")
    if not secret or not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Creator authentication required")

    try:
        payload, signature = credentials.credentials.split(".", 1)
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest()
        received = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, received):
            raise ValueError
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        email = claims["sub"]
        if claims["exp"] < int(time.time()) or not isinstance(email, str) or not email.strip():
            raise ValueError
        return email.strip().lower()
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid creator token")
