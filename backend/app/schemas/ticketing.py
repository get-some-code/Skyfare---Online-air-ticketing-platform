from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator

CabinName = Literal["economy", "premium_economy", "business", "first"]
TripType = Literal["one-way", "round-trip", "multi-city"]
CurrencyCode = Literal["INR", "USD"]
SortKey = Literal["cheapest", "fastest", "best", "departure"]


class Money(BaseModel):
    currency: CurrencyCode
    amount: Decimal
    total: Decimal

    @field_serializer("amount", "total")
    def serialize_money(self, value: Decimal) -> str:
        return f"{value:.2f}"


class AirportSummary(BaseModel):
    code: str
    city: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class AirlineSummary(BaseModel):
    code: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class AirportPublic(AirportSummary):
    country: str
    category: str | None = None
    subtitle: str | None = None
    tag: str | None = None
    image_path: str | None = None
    sample_fare_inr: Decimal | None = None
    sample_fare_usd: Decimal | None = None

    @field_serializer("sample_fare_inr", "sample_fare_usd")
    def serialize_sample(self, value: Decimal | None) -> str | None:
        if value is None:
            return None
        return f"{value:.2f}"


class FlightOffer(BaseModel):
    fare_id: UUID
    flight_id: UUID
    flight_number: str
    airline: AirlineSummary
    origin: AirportSummary
    destination: AirportSummary
    depart_at: datetime
    arrive_at: datetime
    depart_on: date
    duration_minutes: int
    stops: int
    aircraft: str
    cabin: CabinName
    seats_available: int
    price: Money
    source: Literal["market", "catalog"] = "catalog"
    detail: str | None = None
    airline_logo: str | None = None


class SearchCriteria(BaseModel):
    origin: str
    destination: str
    via: str | None = None
    departure: date
    return_date: date | None = None
    trip_type: TripType
    cabin: CabinName
    travellers: int
    direct_only: bool
    flexible_dates: bool
    currency: CurrencyCode
    sort: SortKey


class SearchResponse(BaseModel):
    criteria: SearchCriteria
    outbound: list[FlightOffer]
    inbound: list[FlightOffer] | None = None
    onward: list[FlightOffer] | None = None
    source: Literal["market", "catalog"] = "catalog"
    notice: str | None = None


class PassengerCreate(BaseModel):
    full_name: str | None = None
    title: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    passenger_type: Literal["adult", "child", "infant"] = "adult"
    gender: str | None = None
    nationality: str | None = "Indian"
    passport_number: str | None = None
    passport_expiry: date | None = None

    @model_validator(mode="before")
    @classmethod
    def populate_full_name(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("full_name"):
                parts = [data.get("title"), data.get("first_name"), data.get("last_name")]
                generated = " ".join(p for p in parts if p)
                data["full_name"] = generated or "Passenger"
        return data
    seat_number: str | None = None


class SeatSelection(BaseModel):
    flight_id: UUID
    passenger_index: int = 0
    seat_number: str
    seat_class: str = "standard"
    price: Decimal = Decimal("0.00")


class AddonSelection(BaseModel):
    passenger_index: int | None = None
    category: str
    code: str
    title: str
    price: Decimal


class BookingCreate(BaseModel):
    fare_ids: list[UUID] = Field(min_length=1, max_length=4)
    passengers: list[PassengerCreate] = Field(min_length=1, max_length=9)
    currency: CurrencyCode = "INR"
    trip_type: TripType = "one-way"
    corporate_travel: bool = False
    fare_tier: str = "standard"
    contact_email: str | None = None
    contact_phone: str | None = None
    seats: list[SeatSelection] = Field(default_factory=list)
    addons: list[AddonSelection] = Field(default_factory=list)


class PassengerPublic(BaseModel):
    full_name: str
    date_of_birth: date | None = None
    title: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    passenger_type: str = "adult"
    gender: str | None = None
    nationality: str | None = None
    passport_number: str | None = None
    passport_expiry: date | None = None
    seat_number: str | None = None
    ticket_number: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SeatReservationPublic(BaseModel):
    id: UUID
    flight_id: UUID
    seat_number: str
    seat_class: str
    price_inr: Decimal
    price_usd: Decimal
    status: str
    held_until: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("price_inr", "price_usd")
    def serialize_price(self, value: Decimal) -> str:
        return f"{value:.2f}"


class BookingAddonPublic(BaseModel):
    id: UUID
    category: str
    code: str
    title: str
    price_inr: Decimal
    price_usd: Decimal

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("price_inr", "price_usd")
    def serialize_price(self, value: Decimal) -> str:
        return f"{value:.2f}"


class CancellationPublic(BaseModel):
    reason: str
    cancellation_fee: Decimal
    refund_amount: Decimal
    refund_status: str
    refund_reference: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("cancellation_fee", "refund_amount")
    def serialize_money(self, value: Decimal) -> str:
        return f"{value:.2f}"


class PaymentTransactionPublic(BaseModel):
    transaction_ref: str
    payment_method: str
    amount: Decimal
    currency: str
    status: str
    card_brand: str | None = None
    card_last4: str | None = None
    upi_vpa: str | None = None
    bank_name: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> str:
        return f"{value:.2f}"


class SegmentPublic(BaseModel):
    leg_order: int
    flight_number: str
    airline_name: str
    origin_code: str
    destination_code: str
    depart_at: datetime
    arrive_at: datetime
    cabin: str
    unit_amount: Decimal
    line_amount: Decimal

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("unit_amount", "line_amount")
    def serialize_money(self, value: Decimal) -> str:
        return f"{value:.2f}"


class BookingPublic(BaseModel):
    reference: str
    status: str
    payment_status: str
    trip_type: TripType
    cabin: str
    currency: CurrencyCode
    total_amount: Decimal
    traveller_count: int
    corporate_travel: bool
    created_at: datetime
    cancelled_at: datetime | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    held_until: datetime | None = None
    base_amount: Decimal | None = None
    taxes_amount: Decimal | None = None
    seats_amount: Decimal | None = None
    addons_amount: Decimal | None = None
    convenience_fee: Decimal | None = None
    fare_tier: str | None = "standard"
    pricing_snapshot: dict[str, Any] | None = None
    segments: list[SegmentPublic]
    passengers: list[PassengerPublic]
    seat_reservations: list[SeatReservationPublic] = Field(default_factory=list)
    addons: list[BookingAddonPublic] = Field(default_factory=list)
    payments: list[PaymentTransactionPublic] = Field(default_factory=list)
    cancellation: CancellationPublic | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("total_amount")
    def serialize_total(self, value: Decimal) -> str:
        return f"{value:.2f}"

    @field_serializer(
        "base_amount", "taxes_amount", "seats_amount", "addons_amount", "convenience_fee"
    )
    def serialize_optional_amount(self, value: Decimal | None) -> str | None:
        if value is None:
            return None
        return f"{value:.2f}"


class SeatMapSeat(BaseModel):
    seat_number: str
    row: int
    col: str
    seat_class: Literal["standard", "front_row", "extra_legroom", "emergency_exit"]
    price_inr: Decimal
    price_usd: Decimal
    status: Literal["available", "occupied", "held"]

    @field_serializer("price_inr", "price_usd")
    def serialize_price(self, value: Decimal) -> str:
        return f"{value:.2f}"


class SeatMapResponse(BaseModel):
    flight_id: UUID
    flight_number: str
    aircraft: str
    cabin: str
    rows: int
    layout: str
    seats: list[SeatMapSeat]


class AddonOption(BaseModel):
    category: Literal["baggage", "meal", "priority", "assistance"]
    code: str
    title: str
    description: str
    price_inr: Decimal
    price_usd: Decimal
    icon: str

    @field_serializer("price_inr", "price_usd")
    def serialize_price(self, value: Decimal) -> str:
        return f"{value:.2f}"


class PaymentRequest(BaseModel):
    payment_method: Literal["card", "upi", "net_banking", "wallet"]
    card_number: str | None = None
    card_holder: str | None = None
    card_expiry: str | None = None
    cvv: str | None = None
    upi_vpa: str | None = None
    bank_name: str | None = None
    simulated_action: Literal["success", "fail", "timeout"] = "success"
    idempotency_key: str | None = None


class PaymentResponse(BaseModel):
    transaction_ref: str
    booking_reference: str
    status: Literal["success", "failed", "pending", "processing"]
    amount: Decimal
    currency: str
    payment_method: str
    error_message: str | None = None
    created_at: datetime
    booking: BookingPublic | None = None

    @field_serializer("amount")
    def serialize_amount(self, value: Decimal) -> str:
        return f"{value:.2f}"


class CancellationRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=255)


class PriceCalculationRequest(BaseModel):
    fare_ids: list[UUID]
    travellers: int = Field(ge=1, le=9)
    fare_tier: str = "standard"
    currency: CurrencyCode = "INR"
    seats: list[SeatSelection] = Field(default_factory=list)
    addons: list[AddonSelection] = Field(default_factory=list)


class PriceBreakdownResponse(BaseModel):
    currency: CurrencyCode
    base_fare: Decimal
    taxes_and_fees: Decimal
    seats_fee: Decimal
    addons_fee: Decimal
    convenience_fee: Decimal
    discount: Decimal
    total: Decimal

    @field_serializer(
        "base_fare",
        "taxes_and_fees",
        "seats_fee",
        "addons_fee",
        "convenience_fee",
        "discount",
        "total",
    )
    def serialize_prices(self, value: Decimal) -> str:
        return f"{value:.2f}"
