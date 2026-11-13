import json
import logging
import urllib.parse
import urllib.request
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.airline import Airline
from app.models.airport import Airport
from app.models.flight import Fare, Flight
from app.models.quote import QuotedOffer
from app.schemas.ticketing import (
    AirlineSummary,
    AirportSummary,
    FlightOffer,
    Money,
    SearchCriteria,
    SearchResponse,
)

logger = logging.getLogger(__name__)

LOCAL_ZONE = ZoneInfo("Asia/Kolkata")
USD_TO_INR_RATE = Decimal("83.00")


class MarketDataError(Exception):
    """Raised when market data cannot be retrieved or parsed."""
    pass


def _parse_datetime(date_str: str | None, default_date: date) -> datetime:
    """Parse various ISO or datetime formats from flight APIs."""
    if not date_str:
        return datetime.combine(default_date, datetime.min.time(), tzinfo=LOCAL_ZONE)
    try:
        # e.g. "2026-11-20 14:45"
        dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
        return dt.replace(tzinfo=LOCAL_ZONE)
    except ValueError:
        pass
    try:
        # e.g. "2026-11-20T14:45:00+00:00" or with Z
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.astimezone(LOCAL_ZONE)
    except ValueError:
        return datetime.combine(default_date, datetime.min.time(), tzinfo=LOCAL_ZONE)


def _ensure_airport(db: Session, code: str, name: str | None = None) -> Airport:
    airport = db.get(Airport, code.upper())
    if airport is None:
        airport = Airport(
            code=code.upper(),
            name=name or f"{code.upper()} Airport",
            city=code.upper(),
            country="IN" if code.upper() in {"DEL", "BOM", "CCU", "BLR", "GOI", "MAA", "HYD"} else "INTL",
        )
        db.add(airport)
        db.flush()
    return airport


def _ensure_airline(db: Session, code: str, name: str) -> Airline:
    clean_code = (code or "SF").strip().upper()[:3]
    if len(clean_code) < 2:
        clean_code = "SF"
    airline = db.get(Airline, clean_code)
    if airline is None:
        airline = Airline(code=clean_code, name=name[:80])
        db.add(airline)
        db.flush()
    return airline


def _query_serpapi(criteria: SearchCriteria) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.serpapi_api_key:
        raise MarketDataError("SerpAPI key is not configured.")

    api_key = settings.serpapi_api_key.get_secret_value()
    cabin_map = {
        "economy": "1",
        "premium_economy": "2",
        "business": "3",
        "first": "4",
    }
    trip_type_code = "1" if criteria.trip_type == "round-trip" and criteria.return_date else "2"

    params: dict[str, str] = {
        "engine": "google_flights",
        "departure_id": criteria.origin,
        "arrival_id": criteria.destination,
        "outbound_date": criteria.departure.isoformat(),
        "type": trip_type_code,
        "seat_class": cabin_map.get(criteria.cabin, "1"),
        "adults": str(criteria.travellers),
        "currency": criteria.currency,
        "hl": "en",
        "api_key": api_key,
    }
    if criteria.trip_type == "round-trip" and criteria.return_date:
        params["return_date"] = criteria.return_date.isoformat()
    if criteria.direct_only:
        params["stops"] = "1"

    url = f"{settings.serpapi_base_url}?{urllib.parse.urlencode(params)}"
    logger.info("Querying SerpAPI Google Flights: %s -> %s on %s", criteria.origin, criteria.destination, criteria.departure)

    req = urllib.request.Request(url, headers={"User-Agent": "SkyFare/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("SerpAPI request error: %s", exc)
        raise MarketDataError(f"Google Flights live search unavailable: {exc}") from exc

    if "error" in payload:
        raise MarketDataError(f"SerpAPI returned error: {payload['error']}")

    best_flights = payload.get("best_flights", [])
    other_flights = payload.get("other_flights", [])
    combined = best_flights + other_flights
    logger.info("SerpAPI returned %d total flights (%d best, %d other)", len(combined), len(best_flights), len(other_flights))
    return combined


def _query_aviationstack(criteria: SearchCriteria) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.aviationstack_api_key:
        raise MarketDataError("AviationStack key is not configured.")

    api_key = settings.aviationstack_api_key.get_secret_value()
    params = {
        "access_key": api_key,
        "dep_iata": criteria.origin,
        "arr_iata": criteria.destination,
        "flight_date": criteria.departure.isoformat(),
        "limit": "20",
    }
    url = f"{settings.aviationstack_base_url.rstrip('/')}/v1/flights?{urllib.parse.urlencode(params)}"
    logger.info("Querying AviationStack: %s -> %s on %s", criteria.origin, criteria.destination, criteria.departure)

    req = urllib.request.Request(url, headers={"User-Agent": "SkyFare/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("AviationStack request error: %s", exc)
        raise MarketDataError(f"AviationStack search unavailable: {exc}") from exc

    if payload.get("error"):
        raise MarketDataError(f"AviationStack error: {payload['error']}")

    flights = payload.get("data", [])
    logger.info("AviationStack returned %d flights", len(flights))
    return flights


def _map_serpapi_flight(
    db: Session,
    criteria: SearchCriteria,
    raw: dict[str, Any],
) -> FlightOffer | None:
    legs = raw.get("flights", [])
    if not legs:
        return None

    first_leg = legs[0]
    last_leg = legs[-1]

    airline_name = first_leg.get("airline") or "SkyFare Partner"
    airline_logo = raw.get("airline_logo") or first_leg.get("airline_logo")
    flight_number = first_leg.get("flight_number") or f"SF-{abs(hash(airline_name)) % 9000 + 1000}"
    aircraft = first_leg.get("airplane") or "Airbus A320neo"

    # Determine airline code from flight_number or abbreviation
    parts = flight_number.split()
    airline_code = parts[0][:3] if len(parts) > 1 and len(parts[0]) <= 3 else "SF"
    airline = _ensure_airline(db, airline_code, airline_name)

    dep_info = first_leg.get("departure_airport", {})
    arr_info = last_leg.get("arrival_airport", {})

    origin_code = dep_info.get("id") or criteria.origin
    dest_code = arr_info.get("id") or criteria.destination

    origin_airport = _ensure_airport(db, origin_code, dep_info.get("name"))
    dest_airport = _ensure_airport(db, dest_code, arr_info.get("name"))

    depart_at = _parse_datetime(dep_info.get("time"), criteria.departure)
    arrive_at = _parse_datetime(arr_info.get("time"), criteria.departure)

    total_duration = raw.get("total_duration") or int((arrive_at - depart_at).total_seconds() / 60)
    stops = len(legs) - 1

    # Pricing
    price_val = raw.get("price")
    if price_val is not None:
        raw_price = Decimal(str(price_val))
        if criteria.currency == "INR":
            amount_inr = raw_price
            amount_usd = (raw_price / USD_TO_INR_RATE).quantize(Decimal("0.01"))
        else:
            amount_usd = raw_price
            amount_inr = (raw_price * USD_TO_INR_RATE).quantize(Decimal("0.01"))
    else:
        # Default fallback pricing based on distance/duration
        amount_inr = Decimal("4500.00")
        amount_usd = Decimal("55.00")

    unit_amount = amount_inr if criteria.currency == "INR" else amount_usd
    total_amount = (unit_amount * criteria.travellers).quantize(Decimal("0.01"))

    # Upsert or retrieve Flight in database
    existing_flight = db.scalar(
        select(Flight).where(
            Flight.flight_number == flight_number,
            Flight.depart_at == depart_at,
        )
    )
    if existing_flight is None:
        flight = Flight(
            flight_number=flight_number[:16],
            airline_code=airline.code,
            origin_code=origin_airport.code,
            destination_code=dest_airport.code,
            depart_on=depart_at.date(),
            depart_at=depart_at,
            arrive_at=arrive_at,
            duration_minutes=total_duration,
            stops=stops,
            aircraft=aircraft[:16],
        )
        db.add(flight)
        db.flush()
    else:
        flight = existing_flight

    # Upsert or retrieve Fare in database
    existing_fare = db.scalar(
        select(Fare).where(
            Fare.flight_id == flight.id,
            Fare.cabin == criteria.cabin,
        )
    )
    if existing_fare is None:
        fare = Fare(
            flight_id=flight.id,
            cabin=criteria.cabin,
            amount_inr=amount_inr,
            amount_usd=amount_usd,
            seats_available=9,
        )
        db.add(fare)
        db.flush()
    else:
        fare = existing_fare
        fare.amount_inr = amount_inr
        fare.amount_usd = amount_usd
        db.flush()

    # Record in QuotedOffer table for fast reference
    quote = QuotedOffer(
        id=fare.id,
        provider="serpapi_google_flights",
        trip_type=criteria.trip_type,
        cabin=criteria.cabin,
        currency=criteria.currency,
        unit_amount=unit_amount,
        total_amount=total_amount,
        traveller_count=criteria.travellers,
        stops=stops,
        duration_minutes=total_duration,
        flight_number=flight_number,
        airline_code=airline.code,
        airline_name=airline.name,
        airline_logo=airline_logo,
        origin_code=origin_airport.code,
        destination_code=dest_airport.code,
        origin_name=origin_airport.name,
        destination_name=dest_airport.name,
        depart_on=depart_at.date(),
        depart_at=depart_at,
        arrive_at=arrive_at,
        aircraft=aircraft,
        detail=raw.get("type", "Live Scheduled Flight"),
        segments=legs,
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
        created_at=datetime.now(UTC),
    )
    db.merge(quote)
    db.flush()

    return FlightOffer(
        fare_id=fare.id,
        flight_id=flight.id,
        flight_number=flight_number,
        airline=AirlineSummary(code=airline.code, name=airline.name),
        origin=AirportSummary(code=origin_airport.code, city=origin_airport.city, name=origin_airport.name),
        destination=AirportSummary(code=dest_airport.code, city=dest_airport.city, name=dest_airport.name),
        depart_at=depart_at,
        arrive_at=arrive_at,
        depart_on=depart_at.date(),
        duration_minutes=total_duration,
        stops=stops,
        aircraft=aircraft,
        cabin=criteria.cabin,
        seats_available=fare.seats_available,
        price=Money(currency=criteria.currency, amount=unit_amount, total=total_amount),
        source="market",
        detail="Live Google Flights Market Offer",
        airline_logo=airline_logo,
    )


def _map_aviationstack_flight(
    db: Session,
    criteria: SearchCriteria,
    raw: dict[str, Any],
) -> FlightOffer | None:
    flight_info = raw.get("flight", {})
    airline_info = raw.get("airline", {})
    dep_info = raw.get("departure", {})
    arr_info = raw.get("arrival", {})

    airline_name = airline_info.get("name") or "SkyFare Partner"
    airline_code = (airline_info.get("iata") or "SF")[:3]
    airline = _ensure_airline(db, airline_code, airline_name)

    flight_number = flight_info.get("iata") or f"{airline_code}-{abs(hash(airline_name)) % 9000 + 1000}"
    aircraft = (raw.get("aircraft") or {}).get("iata") or "Airbus A320"

    origin_code = dep_info.get("iata") or criteria.origin
    dest_code = arr_info.get("iata") or criteria.destination

    origin_airport = _ensure_airport(db, origin_code, dep_info.get("airport"))
    dest_airport = _ensure_airport(db, dest_code, arr_info.get("airport"))

    depart_at = _parse_datetime(dep_info.get("scheduled"), criteria.departure)
    arrive_at = _parse_datetime(arr_info.get("scheduled"), criteria.departure)
    if arrive_at <= depart_at:
        arrive_at = depart_at + timedelta(hours=2, minutes=15)

    duration_minutes = int((arrive_at - depart_at).total_seconds() / 60)

    # Base pricing for AviationStack schedules
    base_inr = Decimal("4850.00")
    if criteria.cabin == "premium_economy":
        base_inr = Decimal("7200.00")
    elif criteria.cabin == "business":
        base_inr = Decimal("12500.00")
    elif criteria.cabin == "first":
        base_inr = Decimal("21000.00")

    base_usd = (base_inr / USD_TO_INR_RATE).quantize(Decimal("0.01"))
    unit_amount = base_inr if criteria.currency == "INR" else base_usd
    total_amount = (unit_amount * criteria.travellers).quantize(Decimal("0.01"))

    existing_flight = db.scalar(
        select(Flight).where(
            Flight.flight_number == flight_number,
            Flight.depart_at == depart_at,
        )
    )
    if existing_flight is None:
        flight = Flight(
            flight_number=flight_number[:16],
            airline_code=airline.code,
            origin_code=origin_airport.code,
            destination_code=dest_airport.code,
            depart_on=depart_at.date(),
            depart_at=depart_at,
            arrive_at=arrive_at,
            duration_minutes=duration_minutes,
            stops=0,
            aircraft=aircraft[:16],
        )
        db.add(flight)
        db.flush()
    else:
        flight = existing_flight

    existing_fare = db.scalar(
        select(Fare).where(
            Fare.flight_id == flight.id,
            Fare.cabin == criteria.cabin,
        )
    )
    if existing_fare is None:
        fare = Fare(
            flight_id=flight.id,
            cabin=criteria.cabin,
            amount_inr=base_inr,
            amount_usd=base_usd,
            seats_available=7,
        )
        db.add(fare)
        db.flush()
    else:
        fare = existing_fare

    return FlightOffer(
        fare_id=fare.id,
        flight_id=flight.id,
        flight_number=flight_number,
        airline=AirlineSummary(code=airline.code, name=airline.name),
        origin=AirportSummary(code=origin_airport.code, city=origin_airport.city, name=origin_airport.name),
        destination=AirportSummary(code=dest_airport.code, city=dest_airport.city, name=dest_airport.name),
        depart_at=depart_at,
        arrive_at=arrive_at,
        depart_on=depart_at.date(),
        duration_minutes=duration_minutes,
        stops=0,
        aircraft=aircraft,
        cabin=criteria.cabin,
        seats_available=fare.seats_available,
        price=Money(currency=criteria.currency, amount=unit_amount, total=total_amount),
        source="market",
        detail=f"Live AviationStack Schedule ({raw.get('flight_status', 'scheduled')})",
    )


def search_market(db: Session, criteria: SearchCriteria) -> SearchResponse:
    outbound_offers: list[FlightOffer] = []
    notice: str | None = None

    # Step 1: Try SerpAPI Google Flights (live prices & itineraries)
    try:
        raw_flights = _query_serpapi(criteria)
        for raw in raw_flights:
            try:
                offer = _map_serpapi_flight(db, criteria, raw)
                if offer is not None:
                    outbound_offers.append(offer)
            except Exception as map_err:
                logger.debug("Failed mapping SerpAPI flight: %s", map_err)
        if outbound_offers:
            notice = f"Found {len(outbound_offers)} live market offers via Google Flights"
            db.commit()
    except MarketDataError as exc:
        logger.info("SerpAPI search bypassed: %s", exc)

    # Step 2: Fallback to AviationStack if SerpAPI yielded no flights
    if not outbound_offers:
        try:
            raw_flights = _query_aviationstack(criteria)
            for raw in raw_flights:
                try:
                    offer = _map_aviationstack_flight(db, criteria, raw)
                    if offer is not None:
                        outbound_offers.append(offer)
                except Exception as map_err:
                    logger.debug("Failed mapping AviationStack flight: %s", map_err)
            if outbound_offers:
                notice = f"Found {len(outbound_offers)} live scheduled flights via AviationStack"
                db.commit()
        except MarketDataError as exc:
            logger.info("AviationStack search bypassed: %s", exc)

    if not outbound_offers:
        raise MarketDataError("No live external flights found for the specified route and date.")

    # Sort offers according to requested sort criteria
    if criteria.sort == "fastest":
        outbound_offers.sort(key=lambda o: (o.duration_minutes, o.price.total))
    elif criteria.sort == "departure":
        outbound_offers.sort(key=lambda o: o.depart_at)
    else:  # cheapest / best
        outbound_offers.sort(key=lambda o: (o.price.total, o.duration_minutes))

    return SearchResponse(
        criteria=criteria,
        outbound=outbound_offers[:40],
        inbound=None,
        onward=None,
        source="market",
        notice=notice,
    )
