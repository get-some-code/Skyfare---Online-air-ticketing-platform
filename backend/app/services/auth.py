import re
import secrets
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.exceptions import ServiceError
from app.core.security import (
    create_access_token,
    hash_opaque_token,
    hash_password,
    new_opaque_token,
    verify_password,
)
from app.models.membership import Membership
from app.models.token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    MembershipPublic,
    ProfileUpdate,
    RegisterRequest,
    TokenPair,
    UserPublic,
    normalize_email,
)

_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_GSTIN_PATTERN = re.compile(r"^[0-9A-Z]{15}$")
_MEMBER_BENEFITS = [
    "Mileage credit on reserved itineraries",
    "Saved travellers for repeat bookings",
    "Booking history in My Trips",
]
_PLATINUM_BENEFITS = [
    "Global lounge access on published itineraries",
    "Zero reschedule fee on SkyFare inventory",
    "Fast-track security where the airport offers it",
    "Concierge desk for schedule changes",
]


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _validate_email(email: str) -> str:
    normalized = normalize_email(email)
    if _EMAIL_PATTERN.fullmatch(normalized) is None:
        raise ServiceError(422, "Enter a valid email address.", "validation_error")
    return normalized


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _validate_gstin(value: str | None) -> str | None:
    cleaned = _clean_optional(value)
    if cleaned is None:
        return None
    normalized = cleaned.upper()
    if _GSTIN_PATTERN.fullmatch(normalized) is None:
        raise ServiceError(422, "GSTIN must be 15 letters or digits.", "validation_error")
    return normalized


def _issue_refresh_token(db: Session, user: User) -> str:
    settings = get_settings()
    raw_token = new_opaque_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_opaque_token(raw_token),
            expires_at=_now() + timedelta(days=settings.jwt_refresh_token_days),
            created_at=_now(),
        )
    )
    return raw_token


def _token_pair(db: Session, user: User) -> TokenPair:
    access_token, expires_in = create_access_token(user_id=user.id, role=user.role)
    refresh_token = _issue_refresh_token(db, user)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


def _auth_response(db: Session, user: User) -> AuthResponse:
    tokens = _token_pair(db, user)
    db.commit()
    db.refresh(user)
    return AuthResponse(user=UserPublic.model_validate(user), tokens=tokens)


def register_user(db: Session, payload: RegisterRequest) -> AuthResponse:
    email = _validate_email(payload.email)
    now = _now()
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        phone=_clean_optional(payload.phone),
        role="customer",
        is_active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise ServiceError(
            409,
            "An account with this email already exists.",
            "email_taken",
        ) from exc

    db.add(Membership(user_id=user.id, tier="member", miles=0, joined_at=now))
    return _auth_response(db, user)


def login_user(db: Session, payload: LoginRequest) -> AuthResponse:
    email = normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise ServiceError(401, "Email or password is incorrect.", "invalid_credentials")
    if not user.is_active:
        raise ServiceError(403, "This account is disabled.", "account_disabled")
    return _auth_response(db, user)


def refresh_session(db: Session, raw_token: str) -> TokenPair:
    token_row = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_opaque_token(raw_token))
        .options(selectinload(RefreshToken.user))
    )
    now = _now()
    expired = token_row is not None and _as_utc(token_row.expires_at) <= now
    if token_row is None or token_row.revoked_at is not None or expired:
        raise ServiceError(401, "Refresh token is invalid or expired.", "invalid_token")
    if not token_row.user.is_active:
        raise ServiceError(403, "This account is disabled.", "account_disabled")

    token_row.revoked_at = now
    pair = _token_pair(db, token_row.user)
    db.commit()
    return pair


def logout_session(db: Session, raw_token: str) -> None:
    token_row = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_opaque_token(raw_token))
    )
    if token_row is not None and token_row.revoked_at is None:
        token_row.revoked_at = _now()
        db.commit()


def update_profile(db: Session, user: User, payload: ProfileUpdate) -> UserPublic:
    changes = payload.model_fields_set
    if "full_name" in changes and payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if "phone" in changes:
        user.phone = _clean_optional(payload.phone)
    if "company_name" in changes:
        user.company_name = _clean_optional(payload.company_name)
    if "gstin" in changes:
        user.gstin = _validate_gstin(payload.gstin)
    user.updated_at = _now()
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


def membership_view(membership: Membership) -> MembershipPublic:
    benefits = _PLATINUM_BENEFITS if membership.tier == "platinum" else _MEMBER_BENEFITS
    return MembershipPublic(
        tier=membership.tier,
        miles=membership.miles,
        joined_at=membership.joined_at,
        benefits=benefits,
    )


def join_privilege_club(db: Session, user: User) -> MembershipPublic:
    membership = user.membership
    if membership is None:
        membership = Membership(user_id=user.id, tier="platinum", miles=0, joined_at=_now())
        db.add(membership)
    else:
        membership.tier = "platinum"
    db.commit()
    db.refresh(membership)
    return membership_view(membership)


def credit_miles(db: Session, user: User, amount: Decimal) -> None:
    membership = user.membership
    if membership is None:
        return
    earned = int(amount)
    if earned <= 0:
        return
    membership.miles += earned
    db.add(membership)


def new_booking_reference() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))
