from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), default="reserved")
    trip_type: Mapped[str] = mapped_column(String(32))
    cabin: Mapped[str] = mapped_column(String(32))
    currency: Mapped[str] = mapped_column(String(3))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    traveller_count: Mapped[int] = mapped_column(Integer)
    corporate_travel: Mapped[bool] = mapped_column(Boolean, default=False)
    payment_status: Mapped[str] = mapped_column(String(32), default="unpaid")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    user: Mapped[User] = relationship(back_populates="bookings")
    segments: Mapped[list[BookingSegment]] = relationship(
        back_populates="booking",
        order_by="BookingSegment.leg_order",
    )
    passengers: Mapped[list[Passenger]] = relationship(back_populates="booking")


class BookingSegment(Base):
    __tablename__ = "booking_segments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    fare_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("fares.id"))
    leg_order: Mapped[int] = mapped_column(Integer)
    flight_number: Mapped[str] = mapped_column(String(16))
    airline_name: Mapped[str] = mapped_column(String(80))
    origin_code: Mapped[str] = mapped_column(String(3))
    destination_code: Mapped[str] = mapped_column(String(3))
    depart_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    arrive_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cabin: Mapped[str] = mapped_column(String(32))
    unit_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    line_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    booking: Mapped[Booking] = relationship(back_populates="segments")


class Passenger(Base):
    __tablename__ = "passengers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(120))
    date_of_birth: Mapped[date | None] = mapped_column(Date, default=None)

    booking: Mapped[Booking] = relationship(back_populates="passengers")
