from typing import Any
from datetime import datetime, timedelta

import jwt

from .utils import utc_now


DEFAULT_EXPIRATION = 60 * 15  # 15 minutes
ALGORITHM = "HS256"

DecodeError = jwt.DecodeError


def create_expiration_dt(seconds: int) -> datetime:
    return utc_now() + timedelta(seconds=seconds)


def encode(
    *,
    data: dict[str, Any],
    secret: str,
    expires_at: datetime | None = None,
    expires_in: int | None = DEFAULT_EXPIRATION
) -> str:
    to_encode = data.copy()
    if not expires_at:
        expires_in = expires_in or DEFAULT_EXPIRATION
        expires_at = create_expiration_dt(seconds=expires_in)

    to_encode["exp"] = expires_at
    return jwt.encode(to_encode, secret, algorithm=ALGORITHM)


def decode(*, token: str, secret: str) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=[ALGORITHM])
