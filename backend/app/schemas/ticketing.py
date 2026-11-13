from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

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
    full_name: str = Field(min_length=1, max_length=120)
    date_of_birth: date | None = None


class BookingCreate(BaseModel):
    fare_ids: list[UUID] = Field(min_length=1, max_length=4)
    passengers: list[PassengerCreate] = Field(min_length=1, max_length=9)
    currency: CurrencyCode = "INR"
    trip_type: TripType = "one-way"
    corporate_travel: bool = False


class PassengerPublic(BaseModel):
    full_name: str
    date_of_birth: date | None = None

    model_config = ConfigDict(from_attributes=True)


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
    status: Literal["reserved", "cancelled"]
    payment_status: Literal["unpaid"]
    trip_type: TripType
    cabin: str
    currency: CurrencyCode
    total_amount: Decimal
    traveller_count: int
    corporate_travel: bool
    created_at: datetime
    cancelled_at: datetime | None = None
    segments: list[SegmentPublic]
    passengers: list[PassengerPublic]

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("total_amount")
    def serialize_total(self, value: Decimal) -> str:
        return f"{value:.2f}"
