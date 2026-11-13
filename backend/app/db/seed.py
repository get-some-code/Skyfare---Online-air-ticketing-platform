"""Seed the local SkyFare catalog.

Run from backend/:

    python -m app.db.seed
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.airline import Airline
from app.models.airport import Airport
from app.models.flight import Fare, Flight

LOCAL_ZONE = ZoneInfo("Asia/Kolkata")
USD_RATE = Decimal("83")
CABINS = (
    ("economy", Decimal("1"), 9),
    ("premium_economy", Decimal("1.55"), 6),
    ("business", Decimal("2.35"), 4),
    ("first", Decimal("3.60"), 2),
)
HORIZON_DAYS = 21

AIRPORTS = (
    {
        "code": "CCU",
        "city": "Kolkata",
        "name": "Netaji Subhash Chandra Bose Intl",
        "country": "IN",
        "category": "domestic_hub",
        "subtitle": "City of Joy & Heritage",
        "tag": "-15% Today",
        "image_path": "/images/dest-ccu.jpg",
        "sample_fare_inr": "4250.00",
        "sample_fare_usd": "89.00",
    },
    {
        "code": "DEL",
        "city": "New Delhi",
        "name": "Indira Gandhi International",
        "country": "IN",
        "category": "domestic_hub",
        "subtitle": "Capital Hub & Diplomacy",
        "tag": "Executive Shuttles",
        "image_path": "/images/dest-del.jpg",
        "sample_fare_inr": "3950.00",
        "sample_fare_usd": "75.00",
    },
    {
        "code": "BOM",
        "city": "Mumbai",
        "name": "Chhatrapati Shivaji Maharaj Intl",
        "country": "IN",
        "category": "domestic_hub",
        "subtitle": "Financial Capital of India",
        "tag": "Direct High-Frequency",
        "image_path": "/images/dest-bom.jpg",
        "sample_fare_inr": "4890.00",
        "sample_fare_usd": "92.00",
    },
    {
        "code": "BLR",
        "city": "Bengaluru",
        "name": "Kempegowda International",
        "country": "IN",
        "category": "domestic_hub",
        "subtitle": "Silicon Valley of the East",
        "tag": None,
        "image_path": "/images/dest-blr.jpg",
        "sample_fare_inr": "4500.00",
        "sample_fare_usd": "84.00",
    },
    {
        "code": "GOI",
        "city": "Goa",
        "name": "Manohar International",
        "country": "IN",
        "category": "coastal_retreat",
        "subtitle": "Coastal Retreat & Sunshine",
        "tag": None,
        "image_path": "/images/dest-goi.jpg",
        "sample_fare_inr": "3600.00",
        "sample_fare_usd": "68.00",
    },
    {
        "code": "DXB",
        "city": "Dubai",
        "name": "Dubai International Airport",
        "country": "AE",
        "category": "international_charter",
        "subtitle": "Global Luxury & Innovation",
        "tag": "Global Hub",
        "image_path": "/images/dest-dxb.jpg",
        "sample_fare_inr": "18900.00",
        "sample_fare_usd": "240.00",
    },
)

AIRLINES = (
    ("6E", "IndiGo"),
    ("AI", "Air India"),
    ("UK", "Vistara"),
    ("EK", "Emirates"),
)

# airline, number, origin, destination, hour, minute, duration, stops, aircraft, base INR
SCHEDULES = (
    ("6E", "6E 201", "CCU", "DEL", 8, 30, 150, 0, "A320", 3950),
    ("AI", "AI 764", "CCU", "DEL", 18, 15, 155, 0, "A321", 4200),
    ("6E", "6E 448", "CCU", "DEL", 11, 5, 245, 1, "A320", 3400),
    ("6E", "6E 202", "DEL", "CCU", 10, 0, 150, 0, "A320", 3950),
    ("AI", "AI 765", "DEL", "CCU", 20, 10, 155, 0, "A321", 4100),
    ("6E", "6E 310", "CCU", "BOM", 7, 15, 175, 0, "A320", 4890),
    ("UK", "UK 988", "CCU", "BOM", 16, 40, 180, 0, "A321", 5100),
    ("6E", "6E 311", "BOM", "CCU", 9, 20, 175, 0, "A320", 4890),
    ("6E", "6E 512", "CCU", "BLR", 6, 45, 160, 0, "A320", 4500),
    ("6E", "6E 513", "BLR", "CCU", 12, 30, 160, 0, "A320", 4500),
    ("6E", "6E 640", "CCU", "GOI", 9, 50, 140, 0, "A320", 3600),
    ("6E", "6E 641", "GOI", "CCU", 14, 10, 145, 0, "A320", 3600),
    ("AI", "AI 660", "DEL", "BOM", 7, 0, 125, 0, "A320", 4200),
    ("6E", "6E 2044", "BOM", "DEL", 19, 30, 130, 0, "A321", 4300),
    ("EK", "EK 509", "BOM", "DXB", 4, 20, 210, 0, "B777", 18900),
    ("EK", "EK 500", "DXB", "BOM", 9, 15, 200, 0, "B777", 18900),
    ("EK", "EK 516", "DEL", "DXB", 3, 40, 230, 0, "B777", 17500),
    ("EK", "EK 517", "DXB", "DEL", 8, 55, 215, 0, "B777", 17500),
    ("6E", "6E 774", "BLR", "DEL", 13, 25, 165, 0, "A320", 4600),
    ("AI", "AI 501", "DEL", "BLR", 17, 5, 165, 0, "A320", 4600),
    ("6E", "6E 331", "BOM", "GOI", 11, 40, 75, 0, "A320", 2800),
    ("6E", "6E 332", "GOI", "BOM", 15, 10, 80, 0, "A320", 2800),
)


def _usd(amount_inr: Decimal) -> Decimal:
    return (amount_inr / USD_RATE).quantize(Decimal("0.01"))


def seed_catalog(db: Session) -> None:
    existing = db.scalar(select(func.count()).select_from(Airport))
    if existing:
        return

    for airport in AIRPORTS:
        db.add(
            Airport(
                code=airport["code"],
                city=airport["city"],
                name=airport["name"],
                country=airport["country"],
                category=airport["category"],
                subtitle=airport["subtitle"],
                tag=airport["tag"],
                image_path=airport["image_path"],
                sample_fare_inr=Decimal(airport["sample_fare_inr"]),
                sample_fare_usd=Decimal(airport["sample_fare_usd"]),
            )
        )
    for code, name in AIRLINES:
        db.add(Airline(code=code, name=name))
    db.flush()

    today = datetime.now(LOCAL_ZONE).date()
    for offset in range(HORIZON_DAYS):
        depart_on = today + timedelta(days=offset)
        for schedule in SCHEDULES:
            (
                airline,
                number,
                origin,
                destination,
                hour,
                minute,
                duration,
                stops,
                aircraft,
                base,
            ) = schedule
            depart_at = datetime(
                depart_on.year,
                depart_on.month,
                depart_on.day,
                hour,
                minute,
                tzinfo=LOCAL_ZONE,
            ).astimezone(UTC)
            arrive_at = depart_at + timedelta(minutes=duration)
            flight = Flight(
                flight_number=number,
                airline_code=airline,
                origin_code=origin,
                destination_code=destination,
                depart_on=depart_on,
                depart_at=depart_at,
                arrive_at=arrive_at,
                duration_minutes=duration,
                stops=stops,
                aircraft=aircraft,
            )
            base_amount = Decimal(base)
            for cabin, multiplier, seats in CABINS:
                amount_inr = (base_amount * multiplier).quantize(Decimal("0.01"))
                flight.fares.append(
                    Fare(
                        cabin=cabin,
                        amount_inr=amount_inr,
                        amount_usd=_usd(amount_inr),
                        seats_available=seats,
                    )
                )
            db.add(flight)


def seed_if_empty() -> None:
    with SessionLocal() as session:
        seed_catalog(session)
        session.commit()


if __name__ == "__main__":
    seed_if_empty()
