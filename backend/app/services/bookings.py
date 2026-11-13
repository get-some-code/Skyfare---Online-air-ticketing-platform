from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ServiceError
from app.models.booking import Booking, BookingSegment, Passenger
from app.models.flight import Fare
from app.models.user import User
from app.schemas.ticketing import BookingCreate, BookingPublic, CurrencyCode
from app.services.auth import credit_miles, new_booking_reference

_MILES_PER_CURRENCY = {"INR": Decimal("1"), "USD": Decimal("83")}


def _now() -> datetime:
    return datetime.now(UTC)


def _money(value: Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def _to_public(booking: Booking) -> BookingPublic:
    return BookingPublic.model_validate(booking)


def _load_booking(db: Session, reference: str, user: User) -> Booking | None:
    return db.scalar(
        select(Booking)
        .where(Booking.reference == reference.upper(), Booking.user_id == user.id)
        .options(selectinload(Booking.segments), selectinload(Booking.passengers))
    )


def _lock_fares(db: Session, fare_ids: list) -> list[Fare]:
    statement = select(Fare).where(Fare.id.in_(fare_ids))
    if db.get_bind().dialect.name != "sqlite":
        statement = statement.with_for_update()
    return list(db.scalars(statement).all())


def _available_reference(db: Session) -> str:
    for _ in range(5):
        reference = new_booking_reference()
        exists = db.scalar(select(Booking.id).where(Booking.reference == reference))
        if exists is None:
            return reference
    raise ServiceError(503, "Could not allocate a booking reference.", "reference_unavailable")


def create_booking(db: Session, user: User, payload: BookingCreate) -> BookingPublic:
    if len(payload.fare_ids) != len(set(payload.fare_ids)):
        raise ServiceError(422, "Each selected fare can be booked only once.", "validation_error")

    travellers = len(payload.passengers)
    fare_by_id = {fare.id: fare for fare in _lock_fares(db, payload.fare_ids)}
    ordered: list[Fare] = []
    for fare_id in payload.fare_ids:
        fare = fare_by_id.get(fare_id)
        if fare is None:
            raise ServiceError(
                404,
                "One of the selected fares is no longer available.",
                "fare_not_found",
            )
        if fare.seats_available < travellers:
            raise ServiceError(
                409,
                "Not enough seats remain on one of the selected fares.",
                "insufficient_seats",
            )
        ordered.append(fare)

    if len({fare.cabin for fare in ordered}) != 1:
        raise ServiceError(422, "All selected fares must use the same cabin.", "validation_error")

    currency: CurrencyCode = payload.currency
    segments: list[BookingSegment] = []
    total = Decimal("0.00")
    for index, fare in enumerate(ordered, start=1):
        unit = _money(fare.amount_inr if currency == "INR" else fare.amount_usd)
        line = _money(unit * travellers)
        total += line
        flight = fare.flight
        segments.append(
            BookingSegment(
                fare_id=fare.id,
                leg_order=index,
                flight_number=flight.flight_number,
                airline_name=flight.airline.name,
                origin_code=flight.origin_code,
                destination_code=flight.destination_code,
                depart_at=flight.depart_at,
                arrive_at=flight.arrive_at,
                cabin=fare.cabin,
                unit_amount=unit,
                line_amount=line,
            )
        )
        fare.seats_available -= travellers

    booking = Booking(
        reference=_available_reference(db),
        user_id=user.id,
        status="reserved",
        trip_type=payload.trip_type,
        cabin=ordered[0].cabin,
        currency=currency,
        total_amount=total,
        traveller_count=travellers,
        corporate_travel=payload.corporate_travel,
        payment_status="unpaid",
        created_at=_now(),
        segments=segments,
        passengers=[
            Passenger(full_name=person.full_name.strip(), date_of_birth=person.date_of_birth)
            for person in payload.passengers
        ],
    )
    db.add(booking)
    credit_miles(db, user, total / _MILES_PER_CURRENCY[currency])
    db.commit()

    stored = _load_booking(db, booking.reference, user)
    if stored is None:
        raise ServiceError(
            500,
            "The booking was saved but could not be reloaded.",
            "internal_error",
        )
    return _to_public(stored)


def list_bookings(db: Session, user: User) -> list[BookingPublic]:
    rows = db.scalars(
        select(Booking)
        .where(Booking.user_id == user.id)
        .options(selectinload(Booking.segments), selectinload(Booking.passengers))
        .order_by(Booking.created_at.desc())
    ).all()
    return [_to_public(row) for row in rows]


def get_booking(db: Session, user: User, reference: str) -> BookingPublic:
    booking = _load_booking(db, reference, user)
    if booking is None:
        raise ServiceError(404, "Booking not found.", "booking_not_found")
    return _to_public(booking)


def cancel_booking(db: Session, user: User, reference: str) -> BookingPublic:
    booking = _load_booking(db, reference, user)
    if booking is None:
        raise ServiceError(404, "Booking not found.", "booking_not_found")
    if booking.status == "cancelled":
        raise ServiceError(409, "This booking is already cancelled.", "already_cancelled")

    fare_ids = [segment.fare_id for segment in booking.segments]
    fares = _lock_fares(db, fare_ids)
    for fare in fares:
        fare.seats_available += booking.traveller_count

    booking.status = "cancelled"
    booking.cancelled_at = _now()
    if user.membership is not None:
        earned = int(booking.total_amount / _MILES_PER_CURRENCY[booking.currency])
        user.membership.miles = max(0, user.membership.miles - earned)
    db.commit()
    db.refresh(booking)
    return _to_public(booking)
