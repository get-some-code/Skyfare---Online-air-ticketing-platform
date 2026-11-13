import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.core.exceptions import ServiceError

password_hash = PasswordHash.recommended()
_PLACEHOLDER_SECRETS = {
    "",
    "replace-with-a-random-secret-before-enabling-authentication",
}


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return password_hash.verify(password, hashed_password)
    except (ValueError, TypeError):
        return False


def hash_opaque_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def require_jwt_secret() -> str:
    configured = get_settings().jwt_secret_key
    secret = configured.get_secret_value() if configured is not None else ""
    if secret in _PLACEHOLDER_SECRETS:
        raise ServiceError(
            503,
            "Authentication is not configured. Set JWT_SECRET_KEY before signing in.",
            "auth_not_configured",
        )
    return secret


def create_access_token(*, user_id: UUID, role: str) -> tuple[str, int]:
    settings = get_settings()
    expires_in = settings.jwt_access_token_minutes * 60
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=expires_in)).timestamp()),
    }
    token = jwt.encode(payload, require_jwt_secret(), algorithm="HS256")
    return token, expires_in


def decode_access_token(token: str) -> tuple[UUID, str]:
    try:
        payload = jwt.decode(token, require_jwt_secret(), algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise ServiceError(401, "Invalid or expired access token.", "invalid_token") from exc

    if payload.get("type") != "access" or not payload.get("sub"):
        raise ServiceError(401, "Invalid or expired access token.", "invalid_token")

    try:
        user_id = UUID(str(payload["sub"]))
    except ValueError as exc:
        raise ServiceError(401, "Invalid or expired access token.", "invalid_token") from exc

    role = str(payload.get("role") or "customer")
    return user_id, role
