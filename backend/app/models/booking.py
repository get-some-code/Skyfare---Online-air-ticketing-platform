from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Uuid
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

    # Commercial Enhancements
    contact_email: Mapped[str | None] = mapped_column(String(255), default=None)
    contact_phone: Mapped[str | None] = mapped_column(String(32), default=None)
    held_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    base_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    taxes_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    seats_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    addons_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    convenience_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    fare_tier: Mapped[str | None] = mapped_column(String(32), default="standard")
    pricing_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON, default=None)

    user: Mapped[User] = relationship(back_populates="bookings")
    segments: Mapped[list[BookingSegment]] = relationship(
        back_populates="booking",
        order_by="BookingSegment.leg_order",
        cascade="all, delete-orphan",
    )
    passengers: Mapped[list[Passenger]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    seat_reservations: Mapped[list[SeatReservation]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    addons: Mapped[list[BookingAddon]] = relationship(
        back_populates="booking",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list[PaymentTransaction]] = relationship(
        back_populates="booking",
        order_by="PaymentTransaction.created_at.desc()",
        cascade="all, delete-orphan",
    )
    cancellation: Mapped[Cancellation | None] = relationship(
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan",
    )


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

    # Enhanced passenger fields
    title: Mapped[str | None] = mapped_column(String(10), default=None)
    first_name: Mapped[str | None] = mapped_column(String(60), default=None)
    last_name: Mapped[str | None] = mapped_column(String(60), default=None)
    passenger_type: Mapped[str] = mapped_column(String(20), default="adult")
    gender: Mapped[str | None] = mapped_column(String(20), default=None)
    nationality: Mapped[str | None] = mapped_column(String(60), default="Indian")
    passport_number: Mapped[str | None] = mapped_column(String(40), default=None)
    passport_expiry: Mapped[date | None] = mapped_column(Date, default=None)
    seat_number: Mapped[str | None] = mapped_column(String(8), default=None)
    ticket_number: Mapped[str | None] = mapped_column(String(32), default=None)

    booking: Mapped[Booking] = relationship(back_populates="passengers")


class SeatReservation(Base):
    __tablename__ = "seat_reservations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("flights.id"), index=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    passenger_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("passengers.id", ondelete="SET NULL"),
        default=None,
    )
    seat_number: Mapped[str] = mapped_column(String(8), index=True)
    seat_class: Mapped[str] = mapped_column(String(32), default="standard")
    price_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    price_usd: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    status: Mapped[str] = mapped_column(String(20), default="held", index=True)
    held_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    booking: Mapped[Booking] = relationship(back_populates="seat_reservations")
    passenger: Mapped[Passenger | None] = relationship()


class BookingAddon(Base):
    __tablename__ = "booking_addons"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    passenger_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("passengers.id", ondelete="SET NULL"),
        default=None,
    )
    category: Mapped[str] = mapped_column(String(32))  # baggage, meal, priority, assistance
    code: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(120))
    price_inr: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    price_usd: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))

    booking: Mapped[Booking] = relationship(back_populates="addons")
    passenger: Mapped[Passenger | None] = relationship()


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        index=True,
    )
    transaction_ref: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    payment_method: Mapped[str] = mapped_column(String(32))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(32), index=True)  # pending, processing, success, failed, cancelled
    provider: Mapped[str] = mapped_column(String(32), default="simulated")
    idempotency_key: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, default=None)
    card_brand: Mapped[str | None] = mapped_column(String(32), default=None)
    card_last4: Mapped[str | None] = mapped_column(String(4), default=None)
    upi_vpa: Mapped[str | None] = mapped_column(String(80), default=None)
    bank_name: Mapped[str | None] = mapped_column(String(80), default=None)
    error_message: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    booking: Mapped[Booking] = relationship(back_populates="payments")


class Cancellation(Base):
    __tablename__ = "cancellations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    reason: Mapped[str] = mapped_column(String(255))
    cancellation_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    refund_status: Mapped[str] = mapped_column(String(32), default="completed")
    refund_reference: Mapped[str] = mapped_column(String(40), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    booking: Mapped[Booking] = relationship(back_populates="cancellation")
