from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.exceptions import ServiceError
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MembershipPublic,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserPublic,
)
from app.services import auth as auth_service

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return auth_service.register_user(db, payload)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    return auth_service.login_user(db, payload)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    return auth_service.refresh_session(db, payload.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)) -> None:
    auth_service.logout_session(db, payload.refresh_token)


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublic:
    return auth_service.update_profile(db, user, payload)


@router.get("/membership", response_model=MembershipPublic)
def membership(user: User = Depends(get_current_user)) -> MembershipPublic:
    if user.membership is None:
        raise ServiceError(404, "Membership has not been created for this account.", "not_found")
    return auth_service.membership_view(user.membership)


@router.post("/membership", response_model=MembershipPublic)
def join_membership(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipPublic:
    return auth_service.join_privilege_club(db, user)
