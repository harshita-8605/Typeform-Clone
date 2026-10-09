import base64
import hashlib
import hmac
import json
import os
import time

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.auth import get_creator_email


def token(email: str, expires: int) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"sub": email, "exp": expires}).encode()
    ).rstrip(b"=").decode()
    signature = hmac.new(
        os.environ["BACKEND_AUTH_SECRET"].encode(),
        payload.encode(),
        hashlib.sha256,
    ).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{payload}.{encoded_signature}"


@pytest.fixture(autouse=True)
def auth_secret(monkeypatch):
    monkeypatch.setenv("BACKEND_AUTH_SECRET", "test-secret")


def test_creator_token_returns_normalized_email():
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token(" Creator@Example.com ", int(time.time()) + 60),
    )
    assert get_creator_email(credentials) == "creator@example.com"


def test_missing_token_is_rejected():
    with pytest.raises(HTTPException) as error:
        get_creator_email(None)
    assert error.value.status_code == 401


def test_expired_token_is_rejected():
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token("creator@example.com", int(time.time()) - 1),
    )
    with pytest.raises(HTTPException) as error:
        get_creator_email(credentials)
    assert error.value.status_code == 401
