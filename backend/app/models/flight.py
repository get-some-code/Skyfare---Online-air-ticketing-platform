from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.airline import Airline
    from app.models.airport import Airport


class Flight(Base):
    __tablename__ = "flights"
    __table_args__ = (
        UniqueConstraint("flight_number", "depart_at", name="uq_flights_number_departure"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_number: Mapped[str] = mapped_column(String(16), index=True)
    airline_code: Mapped[str] = mapped_column(String(3), ForeignKey("airlines.code"))
    origin_code: Mapped[str] = mapped_column(String(3), ForeignKey("airports.code"), index=True)
    destination_code: Mapped[str] = mapped_column(
        String(3),
        ForeignKey("airports.code"),
        index=True,
    )
    depart_on: Mapped[date] = mapped_column(Date, index=True)
    depart_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    arrive_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    stops: Mapped[int] = mapped_column(Integer, default=0)
    aircraft: Mapped[str] = mapped_column(String(16))

    airline: Mapped[Airline] = relationship(back_populates="flights")
    origin: Mapped[Airport] = relationship(foreign_keys=[origin_code])
    destination: Mapped[Airport] = relationship(foreign_keys=[destination_code])
    fares: Mapped[list[Fare]] = relationship(back_populates="flight")


class Fare(Base):
    __tablename__ = "fares"
    __table_args__ = (UniqueConstraint("flight_id", "cabin", name="uq_fares_flight_cabin"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("flights.id", ondelete="CASCADE"),
        index=True,
    )
    cabin: Mapped[str] = mapped_column(String(32))
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    amount_usd: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    seats_available: Mapped[int] = mapped_column(Integer)

    flight: Mapped[Flight] = relationship(back_populates="fares")
