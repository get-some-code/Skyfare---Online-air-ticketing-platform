import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import ServiceError
from app.models.booking import (
    Booking,
    BookingAddon,
    BookingSegment,
    Cancellation,
    Passenger,
    PaymentTransaction,
    SeatReservation,
)
from app.models.flight import Fare, Flight
from app.models.user import User
from app.schemas.ticketing import (
    AddonOption,
    BookingCreate,
    BookingPublic,
    CancellationRequest,
    CurrencyCode,
    PaymentRequest,
    PaymentResponse,
    PriceBreakdownResponse,
    PriceCalculationRequest,
    SeatMapResponse,
    SeatMapSeat,
)
from app.services.auth import credit_miles, new_booking_reference

LOCAL_ZONE = ZoneInfo("Asia/Kolkata")
_MILES_PER_CURRENCY = {"INR": Decimal("1"), "USD": Decimal("83")}
HOLD_MINUTES = 10


def _now() -> datetime:
    return datetime.now(UTC)


def _money(value: Decimal | float | int) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _load_booking(db: Session, reference: str, user: User) -> Booking | None:
    return db.scalar(
        select(Booking)
        .where(Booking.reference == reference.upper(), Booking.user_id == user.id)
        .options(
            selectinload(Booking.segments),
            selectinload(Booking.passengers),
            selectinload(Booking.seat_reservations),
            selectinload(Booking.addons),
            selectinload(Booking.payments),
            selectinload(Booking.cancellation),
            selectinload(Booking.user),
        )
    )


def _to_public(booking: Booking) -> BookingPublic:
    return BookingPublic.model_validate(booking)


def _lock_fares(db: Session, fare_ids: list[uuid.UUID]) -> list[Fare]:
    statement = (
        select(Fare)
        .where(Fare.id.in_(fare_ids))
        .options(
            selectinload(Fare.flight).selectinload(Flight.airline),
            selectinload(Fare.flight).selectinload(Flight.origin),
            selectinload(Fare.flight).selectinload(Flight.destination),
        )
    )
    if db.get_bind().dialect.name != "sqlite":
        statement = statement.with_for_update()
    return list(db.scalars(statement).all())


def _available_reference(db: Session) -> str:
    for _ in range(10):
        reference = new_booking_reference()
        exists = db.scalar(select(Booking.id).where(Booking.reference == reference))
        if exists is None:
            return reference
    raise ServiceError(503, "Could not allocate a booking reference.", "reference_unavailable")


def _clean_expired_holds(db: Session) -> None:
    """Release expired seat reservations older than their held_until timestamp."""
    now = _now()
    expired_reservations = list(
        db.scalars(
            select(SeatReservation).where(
                SeatReservation.status == "held",
                SeatReservation.held_until < now,
            )
        ).all()
    )
    for res in expired_reservations:
        res.status = "released"
    if expired_reservations:
        db.flush()


def get_seat_map(db: Session, flight_id: uuid.UUID, cabin: str = "economy") -> SeatMapResponse:
    """Generate realistic aircraft seat map with live occupied/held states."""
    _clean_expired_holds(db)

    flight = db.get(Flight, flight_id)
    flight_number = flight.flight_number if flight else "SKF-101"
    aircraft = flight.aircraft if flight else "Airbus A320neo"

    # Query currently active reservations for this flight
    now = _now()
    active_reservations = list(
        db.scalars(
            select(SeatReservation).where(
                SeatReservation.flight_id == flight_id,
                SeatReservation.status.in_(["held", "confirmed"]),
                (SeatReservation.status == "confirmed") | (SeatReservation.held_until >= now),
            )
        ).all()
    )
    occupied_seat_numbers = {r.seat_number: r.status for r in active_reservations}

    # Deterministic occupied seats based on flight_id hash for realism
    seed = int(hashlib.md5(str(flight_id).encode()).hexdigest(), 16)
    simulated_occupied = set()
    cols = ["A", "B", "C", "D", "E", "F"]
    for r in range(1, 31):
        for c in cols:
            seat_code = f"{r}{c}"
            # ~20% of seats randomly occupied
            if (seed + r * 7 + ord(c)) % 5 == 0:
                simulated_occupied.add(seat_code)

    seats: list[SeatMapSeat] = []
    for row in range(1, 31):
        for col in cols:
            seat_number = f"{row}{col}"

            # Determine seat class and pricing
            if row <= 4:
                seat_class = "front_row"
                price_inr = Decimal("600.00")
                price_usd = Decimal("8.00")
            elif row in (12, 13, 14):
                seat_class = "emergency_exit"
                price_inr = Decimal("850.00")
                price_usd = Decimal("11.00")
            elif row <= 10:
                seat_class = "extra_legroom"
                price_inr = Decimal("350.00")
                price_usd = Decimal("5.00")
            else:
                seat_class = "standard"
                # Middle seats free, window & aisle small fee
                if col in ("A", "F", "C", "D"):
                    price_inr = Decimal("200.00")
                    price_usd = Decimal("3.00")
                else:
                    price_inr = Decimal("0.00")
                    price_usd = Decimal("0.00")

            if seat_number in occupied_seat_numbers:
                status = "occupied" if occupied_seat_numbers[seat_number] == "confirmed" else "held"
            elif seat_number in simulated_occupied:
                status = "occupied"
            else:
                status = "available"

            seats.append(
                SeatMapSeat(
                    seat_number=seat_number,
                    row=row,
                    col=col,
                    seat_class=seat_class,
                    price_inr=price_inr,
                    price_usd=price_usd,
                    status=status,
                )
            )

    return SeatMapResponse(
        flight_id=flight_id,
        flight_number=flight_number,
        aircraft=aircraft,
        cabin=cabin,
        rows=30,
        layout="3-3",
        seats=seats,
    )


def get_available_addons() -> list[AddonOption]:
    """Return available commercial add-on options."""
    return [
        AddonOption(
            category="baggage",
            code="BAG_5KG",
            title="Extra Checked Baggage (+5 Kg)",
            description="Add 5 kg check-in baggage allowance for your journey.",
            price_inr=Decimal("1200.00"),
            price_usd=Decimal("15.00"),
            icon="luggage",
        ),
        AddonOption(
            category="baggage",
            code="BAG_10KG",
            title="Extra Checked Baggage (+10 Kg)",
            description="Add 10 kg check-in baggage allowance at discounted prepaid rates.",
            price_inr=Decimal("2200.00"),
            price_usd=Decimal("28.00"),
            icon="luggage",
        ),
        AddonOption(
            category="meal",
            code="MEAL_HINDU_VEG",
            title="Royal Indian Vegetarian Thali",
            description="Warm gourmet meal with paneer, dal makhani, jeera rice, and dessert.",
            price_inr=Decimal("380.00"),
            price_usd=Decimal("5.00"),
            icon="utensils",
        ),
        AddonOption(
            category="meal",
            code="MEAL_JAIN",
            title="Jain Satvik Meal",
            description="Pure vegetarian meal prepared without root vegetables, garlic, or onions.",
            price_inr=Decimal("380.00"),
            price_usd=Decimal("5.00"),
            icon="utensils",
        ),
        AddonOption(
            category="meal",
            code="MEAL_CHEF_SPECIAL",
            title="Chef's Continental Gourmet Platter",
            description="Grilled artisanal entree with fresh sourdough roll, salad, and chocolate mousse.",
            price_inr=Decimal("550.00"),
            price_usd=Decimal("7.00"),
            icon="utensils",
        ),
        AddonOption(
            category="priority",
            code="PRIORITY_BOARDING",
            title="Priority Boarding & Express Baggage",
            description="Skip the terminal boarding queue and receive your bags first on the carousel.",
            price_inr=Decimal("450.00"),
            price_usd=Decimal("6.00"),
            icon="zap",
        ),
        AddonOption(
            category="assistance",
            code="SPECIAL_ASSIST",
            title="Wheelchair & Meet-and-Greet Assistance",
            description="Complimentary wheelchair support from check-in counter to aircraft seat.",
            price_inr=Decimal("0.00"),
            price_usd=Decimal("0.00"),
            icon="heart-handshake",
        ),
    ]


def calculate_price_breakdown(
    db: Session,
    payload: PriceCalculationRequest,
) -> PriceBreakdownResponse:
    """Calculate transparent, itemized server-authoritative pricing."""
    fares = list(db.scalars(select(Fare).where(Fare.id.in_(payload.fare_ids))).all())
    if not fares:
        raise ServiceError(404, "Selected flight fares not found.", "fare_not_found")

    travellers = payload.travellers
    currency = payload.currency

    # 1. Base fare calculation
    base_fare = Decimal("0.00")
    for fare in fares:
        unit = fare.amount_inr if currency == "INR" else fare.amount_usd
        base_fare += _money(unit * travellers)

    # 2. Fare Tier Adjustments
    if payload.fare_tier == "flexi":
        tier_multiplier = Decimal("1.18")
    elif payload.fare_tier == "executive":
        tier_multiplier = Decimal("1.45")
    else:
        tier_multiplier = Decimal("1.00")

    adjusted_base = _money(base_fare * tier_multiplier)

    # 3. Airport Taxes & Fees (User Development Fee, Passenger Service Fee, GST ~12%)
    taxes_and_fees = _money(adjusted_base * Decimal("0.12") + Decimal("450.00") * travellers)

    # 4. Seat selection fees
    seats_fee = Decimal("0.00")
    for seat in payload.seats:
        seats_fee += _money(seat.price)

    # If Flexi or Executive, standard seats are complimentary
    if payload.fare_tier in ("flexi", "executive"):
        seats_fee = _money(seats_fee * Decimal("0.50"))

    # 5. Add-ons fees
    addons_fee = Decimal("0.00")
    for addon in payload.addons:
        addons_fee += _money(addon.price)

    # 6. Convenience Fee
    convenience_fee = Decimal("300.00") if currency == "INR" else Decimal("4.00")

    # 7. Discount (e.g. Corporate / Privilege Club)
    discount = Decimal("0.00")

    total = _money(adjusted_base + taxes_and_fees + seats_fee + addons_fee + convenience_fee - discount)

    return PriceBreakdownResponse(
        currency=currency,
        base_fare=adjusted_base,
        taxes_and_fees=taxes_and_fees,
        seats_fee=seats_fee,
        addons_fee=addons_fee,
        convenience_fee=convenience_fee,
        discount=discount,
        total=total,
    )


def create_booking(db: Session, user: User, payload: BookingCreate) -> BookingPublic:
    """Create a commercial flight reservation with seat holds, add-ons, and pricing snapshot."""
    if len(payload.fare_ids) != len(set(payload.fare_ids)):
        raise ServiceError(422, "Each selected fare can be booked only once.", "validation_error")

    _clean_expired_holds(db)

    travellers = len(payload.passengers)
    fare_by_id = {fare.id: fare for fare in _lock_fares(db, payload.fare_ids)}
    ordered: list[Fare] = []
    for fare_id in payload.fare_ids:
        fare = fare_by_id.get(fare_id)
        if fare is None:
            raise ServiceError(404, "One of the selected fares is no longer available.", "fare_not_found")
        if fare.seats_available < travellers:
            raise ServiceError(409, "Not enough seats remain on one of the selected fares.", "insufficient_seats")
        ordered.append(fare)

    currency: CurrencyCode = payload.currency

    # Compute server-side authoritative pricing
    pricing_req = PriceCalculationRequest(
        fare_ids=payload.fare_ids,
        travellers=travellers,
        fare_tier=payload.fare_tier,
        currency=currency,
        seats=payload.seats,
        addons=payload.addons,
    )
    pricing = calculate_price_breakdown(db, pricing_req)

    # Prepare segments
    segments: list[BookingSegment] = []
    for index, fare in enumerate(ordered, start=1):
        unit = _money(fare.amount_inr if currency == "INR" else fare.amount_usd)
        line = _money(unit * travellers)
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

    _clean_expired_holds(db)

    # Concurrency control: Validate seat availability if seats were requested
    if payload.seats:
        for seat in payload.seats:
            flight = next((f.flight for f in ordered if f.flight_id == seat.flight_id), ordered[0].flight)
            existing_seat = db.scalar(
                select(SeatReservation).where(
                    SeatReservation.flight_id == flight.id,
                    SeatReservation.seat_number == seat.seat_number.upper(),
                    SeatReservation.status.in_(["held", "confirmed"]),
                )
            )
            if existing_seat is not None:
                raise ServiceError(
                    409,
                    f"Seat {seat.seat_number.upper()} is no longer available on flight {flight.flight_number}.",
                    "seat_already_reserved",
                )

    reference = _available_reference(db)
    held_until = _now() + timedelta(minutes=HOLD_MINUTES)

    # Prepare passengers
    db_passengers: list[Passenger] = []
    for idx, person in enumerate(payload.passengers):
        # Extract title and names
        full_name = person.full_name.strip()
        first_name = person.first_name or full_name.split()[0]
        last_name = person.last_name or (" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "")
        ticket_number = f"098-{abs(hash(reference + str(idx))) % 9000000000 + 1000000000}"

        # Assigned seat if provided in payload.seats
        assigned_seat = person.seat_number
        if not assigned_seat and idx < len(payload.seats):
            assigned_seat = payload.seats[idx].seat_number

        db_passengers.append(
            Passenger(
                full_name=full_name,
                title=person.title or "Mr",
                first_name=first_name,
                last_name=last_name,
                date_of_birth=person.date_of_birth,
                passenger_type=person.passenger_type,
                gender=person.gender,
                nationality=person.nationality or "Indian",
                passport_number=person.passport_number,
                passport_expiry=person.passport_expiry,
                seat_number=assigned_seat,
                ticket_number=ticket_number,
            )
        )

    booking = Booking(
        reference=reference,
        user_id=user.id,
        status="SEATS_HELD",
        trip_type=payload.trip_type,
        cabin=ordered[0].cabin,
        currency=currency,
        total_amount=pricing.total,
        traveller_count=travellers,
        corporate_travel=payload.corporate_travel,
        payment_status="pending",
        created_at=_now(),
        held_until=held_until,
        contact_email=payload.contact_email or user.email,
        contact_phone=payload.contact_phone or user.phone,
        base_amount=pricing.base_fare,
        taxes_amount=pricing.taxes_and_fees,
        seats_amount=pricing.seats_fee,
        addons_amount=pricing.addons_fee,
        convenience_fee=pricing.convenience_fee,
        fare_tier=payload.fare_tier,
        pricing_snapshot=pricing.model_dump(mode="json"),
        segments=segments,
        passengers=db_passengers,
    )
    db.add(booking)
    db.flush()

    # Reserve held seats
    for seat in payload.seats:
        flight = next((f.flight for f in ordered if f.flight_id == seat.flight_id), ordered[0].flight)
        p_id = (
            db_passengers[seat.passenger_index].id
            if 0 <= seat.passenger_index < len(db_passengers)
            else None
        )
        db.add(
            SeatReservation(
                flight_id=flight.id,
                booking_id=booking.id,
                passenger_id=p_id,
                seat_number=seat.seat_number.upper(),
                seat_class=seat.seat_class,
                price_inr=seat.price if currency == "INR" else _money(seat.price * Decimal("83")),
                price_usd=seat.price if currency == "USD" else _money(seat.price / Decimal("83")),
                status="held",
                held_until=held_until,
                created_at=_now(),
            )
        )

    # Add-on records
    for addon in payload.addons:
        p_id = (
            db_passengers[addon.passenger_index].id
            if addon.passenger_index is not None and 0 <= addon.passenger_index < len(db_passengers)
            else None
        )
        db.add(
            BookingAddon(
                booking_id=booking.id,
                passenger_id=p_id,
                category=addon.category,
                code=addon.code,
                title=addon.title,
                price_inr=addon.price if currency == "INR" else _money(addon.price * Decimal("83")),
                price_usd=addon.price if currency == "USD" else _money(addon.price / Decimal("83")),
            )
        )

    # Award miles for booking
    credit_miles(db, user, booking.total_amount / _MILES_PER_CURRENCY[booking.currency])

    db.commit()

    stored = _load_booking(db, booking.reference, user)
    if stored is None:
        raise ServiceError(500, "The booking was saved but could not be reloaded.", "internal_error")
    return _to_public(stored)


def process_payment(
    db: Session,
    user: User,
    reference: str,
    payload: PaymentRequest,
) -> PaymentResponse:
    """Execute simulated payment gateway transaction with idempotency and state validation."""
    booking = _load_booking(db, reference, user)
    if booking is None:
        raise ServiceError(404, "Booking not found.", "booking_not_found")

    if booking.status == "CONFIRMED":
        raise ServiceError(409, "This booking has already been paid and confirmed.", "already_confirmed")
    if booking.status == "CANCELLED":
        raise ServiceError(409, "Cannot process payment on a cancelled booking.", "booking_cancelled")

    # Check hold expiration
    now = _now()
    held_until = booking.held_until
    if held_until:
        if held_until.tzinfo is None:
            held_until = held_until.replace(tzinfo=UTC)
        if held_until < now:
            booking.status = "EXPIRED"
            # Release seat holds
            for seat_res in booking.seat_reservations:
                seat_res.status = "released"
            # Return seats to fares
            for seg in booking.segments:
                fare = db.get(Fare, seg.fare_id)
                if fare:
                    fare.seats_available += booking.traveller_count
            db.commit()
            raise ServiceError(
                410,
                "Your booking session and seat hold have expired. Please initiate a new flight search.",
                "session_expired",
            )

    # Check idempotency key if provided
    if payload.idempotency_key:
        existing_txn = db.scalar(
            select(PaymentTransaction).where(
                PaymentTransaction.idempotency_key == payload.idempotency_key,
                PaymentTransaction.booking_id == booking.id,
            )
        )
        if existing_txn and existing_txn.status == "success":
            return PaymentResponse(
                transaction_ref=existing_txn.transaction_ref,
                booking_reference=booking.reference,
                status="success",
                amount=existing_txn.amount,
                currency=existing_txn.currency,
                payment_method=existing_txn.payment_method,
                created_at=existing_txn.created_at,
                booking=_to_public(booking),
            )

    txn_ref = f"TXN-{booking.reference}-{uuid.uuid4().hex[:6].upper()}"

    # Handle simulated payment actions
    if payload.simulated_action == "fail":
        failed_txn = PaymentTransaction(
            booking_id=booking.id,
            transaction_ref=txn_ref,
            payment_method=payload.payment_method,
            amount=booking.total_amount,
            currency=booking.currency,
            status="failed",
            provider="simulated",
            idempotency_key=payload.idempotency_key,
            card_last4=payload.card_number[-4:] if payload.card_number and len(payload.card_number) >= 4 else "1234",
            upi_vpa=payload.upi_vpa,
            bank_name=payload.bank_name,
            error_message="Card issuer declined authorization. Please retry or choose another payment method.",
            created_at=now,
            updated_at=now,
        )
        db.add(failed_txn)
        booking.status = "PAYMENT_FAILED"
        booking.payment_status = "failed"
        db.commit()
        db.refresh(booking)

        return PaymentResponse(
            transaction_ref=txn_ref,
            booking_reference=booking.reference,
            status="failed",
            amount=booking.total_amount,
            currency=booking.currency,
            payment_method=payload.payment_method,
            error_message=failed_txn.error_message,
            created_at=now,
            booking=_to_public(booking),
        )

    # Successful payment simulation
    card_brand = "Visa" if payload.payment_method == "card" else None
    card_last4 = (
        payload.card_number[-4:]
        if payload.card_number and len(payload.card_number) >= 4
        else ("4242" if payload.payment_method == "card" else None)
    )

    success_txn = PaymentTransaction(
        booking_id=booking.id,
        transaction_ref=txn_ref,
        payment_method=payload.payment_method,
        amount=booking.total_amount,
        currency=booking.currency,
        status="success",
        provider="simulated",
        idempotency_key=payload.idempotency_key,
        card_brand=card_brand,
        card_last4=card_last4,
        upi_vpa=payload.upi_vpa,
        bank_name=payload.bank_name,
        created_at=now,
        updated_at=now,
    )
    db.add(success_txn)

    # Confirm booking and seat reservations
    booking.status = "CONFIRMED"
    booking.payment_status = "paid"
    for seat_res in booking.seat_reservations:
        seat_res.status = "confirmed"

    db.commit()

    updated_booking = _load_booking(db, booking.reference, user)
    return PaymentResponse(
        transaction_ref=txn_ref,
        booking_reference=booking.reference,
        status="success",
        amount=booking.total_amount,
        currency=booking.currency,
        payment_method=payload.payment_method,
        created_at=now,
        booking=_to_public(updated_booking),
    )


def list_bookings(db: Session, user: User) -> list[BookingPublic]:
    _clean_expired_holds(db)
    rows = db.scalars(
        select(Booking)
        .where(Booking.user_id == user.id)
        .options(
            selectinload(Booking.segments),
            selectinload(Booking.passengers),
            selectinload(Booking.seat_reservations),
            selectinload(Booking.addons),
            selectinload(Booking.payments),
            selectinload(Booking.cancellation),
        )
        .order_by(Booking.created_at.desc())
    ).all()
    return [_to_public(row) for row in rows]


def get_booking(db: Session, user: User, reference: str) -> BookingPublic:
    _clean_expired_holds(db)
    booking = _load_booking(db, reference, user)
    if booking is None:
        raise ServiceError(404, "Booking not found.", "booking_not_found")
    return _to_public(booking)


def cancel_booking(
    db: Session,
    user: User,
    reference: str,
    payload: CancellationRequest | None = None,
) -> BookingPublic:
    """Cancel booking, release seat inventory, compute cancellation fee and simulated refund."""
    booking = _load_booking(db, reference, user)
    if booking is None:
        raise ServiceError(404, "Booking not found.", "booking_not_found")
    if booking.status in ("CANCELLED", "cancelled"):
        raise ServiceError(409, "This booking is already cancelled.", "already_cancelled")

    now = _now()
    first_departure = booking.segments[0].depart_at if booking.segments else now
    if first_departure.tzinfo is None:
        first_departure = first_departure.replace(tzinfo=UTC)
    hours_to_dep = (first_departure - now).total_seconds() / 3600

    # Cancellation fee calculation based on departure proximity
    if booking.fare_tier == "executive":
        fee = Decimal("0.00")
    elif booking.fare_tier == "flexi":
        fee = Decimal("500.00") * booking.traveller_count
    elif hours_to_dep > 72:
        fee = Decimal("1500.00") * booking.traveller_count
    elif hours_to_dep > 24:
        fee = Decimal("2500.00") * booking.traveller_count
    else:
        fee = _money(booking.total_amount * Decimal("0.50"))

    if booking.currency == "USD":
        fee = _money(fee / Decimal("83.00"))

    if fee > booking.total_amount:
        fee = booking.total_amount

    refund_amount = _money(booking.total_amount - fee)

    # Release seats in inventory
    fare_ids = [segment.fare_id for segment in booking.segments]
    fares = _lock_fares(db, fare_ids)
    for fare in fares:
        fare.seats_available += booking.traveller_count

    # Mark seat reservations as released
    for res in booking.seat_reservations:
        res.status = "released"

    booking.status = "CANCELLED"
    booking.cancelled_at = now
    booking.payment_status = "refunded" if refund_amount > Decimal("0.00") else "cancelled"

    # Create cancellation record
    cancellation_record = Cancellation(
        booking_id=booking.id,
        reason=(payload.reason if payload else "Passenger voluntary cancellation"),
        cancellation_fee=fee,
        refund_amount=refund_amount,
        refund_status="completed",
        refund_reference=f"REF-{booking.reference}-{uuid.uuid4().hex[:4].upper()}",
        created_at=now,
    )
    db.add(cancellation_record)

    # Deduct miles
    if user.membership is not None:
        earned = int(booking.total_amount / _MILES_PER_CURRENCY[booking.currency])
        user.membership.miles = max(0, user.membership.miles - earned)

    db.commit()
    db.refresh(booking)
    return _to_public(booking)


def get_ticket_pdf(db: Session, user: User, reference: str) -> bytes:
    from app.services.ticket_pdf import generate_ticket_pdf

    booking = _load_booking(db, reference, user)
    if booking is None:
        raise ServiceError(404, "Booking not found.", "booking_not_found")
    if booking.status not in ("CONFIRMED", "confirmed"):
        raise ServiceError(
            400,
            "E-ticket PDF is only available for confirmed bookings.",
            "ticket_not_available",
        )
    return generate_ticket_pdf(booking)

