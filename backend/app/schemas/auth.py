from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=20)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20, max_length=512)


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    company_name: str | None = Field(default=None, max_length=160)
    gstin: str | None = Field(default=None, max_length=15)


class UserPublic(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: str | None = None
    company_name: str | None = None
    gstin: str | None = None
    role: str

    model_config = ConfigDict(from_attributes=True)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(BaseModel):
    user: UserPublic
    tokens: TokenPair


class MembershipPublic(BaseModel):
    tier: str
    miles: int
    joined_at: datetime
    benefits: list[str]


def normalize_email(email: str) -> str:
    return email.strip().lower()
