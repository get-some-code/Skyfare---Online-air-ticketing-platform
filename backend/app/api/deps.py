from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ServiceError
from app.core.security import decode_access_token
from app.db.session import get_db_session
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_db(db: Session = Depends(get_db_session)) -> Session:
    return db


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise ServiceError(401, "Authentication is required.", "unauthorized")

    user_id, _role = decode_access_token(credentials.credentials)
    user = db.scalar(
        select(User).where(User.id == user_id).options(selectinload(User.membership))
    )
    if user is None or not user.is_active:
        raise ServiceError(401, "Invalid or expired access token.", "invalid_token")
    return user
