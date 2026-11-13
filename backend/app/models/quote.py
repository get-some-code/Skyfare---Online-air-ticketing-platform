from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import JSON, Date, DateTime, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QuotedOffer(Base):
    __tablename__ = "quoted_offers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(32))
    trip_type: Mapped[str] = mapped_column(String(32))
    cabin: Mapped[str] = mapped_column(String(32))
    currency: Mapped[str] = mapped_column(String(3))
    unit_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    traveller_count: Mapped[int] = mapped_column(Integer)
    stops: Mapped[int] = mapped_column(Integer)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    flight_number: Mapped[str] = mapped_column(String(32))
    airline_code: Mapped[str] = mapped_column(String(3))
    airline_name: Mapped[str] = mapped_column(String(80))
    airline_logo: Mapped[str | None] = mapped_column(String(255), default=None)
    origin_code: Mapped[str] = mapped_column(String(3))
    destination_code: Mapped[str] = mapped_column(String(3))
    origin_name: Mapped[str] = mapped_column(String(160))
    destination_name: Mapped[str] = mapped_column(String(160))
    depart_on: Mapped[date] = mapped_column(Date)
    depart_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    arrive_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    aircraft: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str | None] = mapped_column(String(255), default=None)
    segments: Mapped[list] = mapped_column(JSON)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
