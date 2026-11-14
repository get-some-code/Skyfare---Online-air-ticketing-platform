import logging
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.exceptions import ServiceError
from app.models.airport import Airport
from app.models.flight import Fare, Flight
from app.schemas.ticketing import (
    AirlineSummary,
    AirportPublic,
    AirportSummary,
    CabinName,
    CurrencyCode,
    FlightOffer,
    Money,
    SearchCriteria,
    SearchResponse,
    SortKey,
    TripType,
)

logger = logging.getLogger(__name__)

_CABIN_ALIASES = {
    "economy": "economy",
    "premium economy": "premium_economy",
    "premium_economy": "premium_economy",
    "business": "business",
    "business / flexi": "business",
    "business/flexi": "business",
    "first": "first",
    "first class": "first",
}
_TRIP_ALIASES = {
    "one-way": "one-way",
    "one_way": "one-way",
    "oneway": "one-way",
    "round-trip": "round-trip",
    "round_trip": "round-trip",
    "roundtrip": "round-trip",
    "multi-city": "multi-city",
    "multi_city": "multi-city",
    "multicity": "multi-city",
}
_SORT_ALIASES = {
    "cheapest": "cheapest",
    "fastest": "fastest",
    "best": "best",
    "best value": "best",
    "departure": "departure",
}


def normalize_cabin(value: str) -> CabinName:
    cabin = _CABIN_ALIASES.get(value.strip().lower())
    if cabin is None:
        raise ServiceError(
            422,
            "Cabin must be Economy, Premium Economy, Business / Flexi, or First Class.",
            "validation_error",
        )
    return cabin


def normalize_trip_type(value: str) -> TripType:
    trip_type = _TRIP_ALIASES.get(value.strip().lower())
    if trip_type is None:
        raise ServiceError(
            422,
            "Trip type must be one-way, round-trip, or multi-city.",
            "validation_error",
        )
    return trip_type


def normalize_sort(value: str) -> SortKey:
    sort_key = _SORT_ALIASES.get(value.strip().lower())
    if sort_key is None:
        raise ServiceError(
            422,
            "Sort must be cheapest, fastest, best, or departure.",
            "validation_error",
        )
    return sort_key


def _airport_code(value: str, label: str) -> str:
    code = value.strip().upper()
    if len(code) != 3 or not code.isalpha():
        raise ServiceError(422, f"{label} must be a 3-letter airport code.", "validation_error")
    return code


KNOWN_GLOBAL_AIRPORTS: dict[str, tuple[str, str, str]] = {
    "DEL": ("New Delhi", "Indira Gandhi International Airport", "IN"),
    "BOM": ("Mumbai", "Chhatrapati Shivaji Maharaj International", "IN"),
    "BLR": ("Bengaluru", "Kempegowda International Airport", "IN"),
    "CCU": ("Kolkata", "Netaji Subhash Chandra Bose Intl", "IN"),
    "MAA": ("Chennai", "Chennai International Airport", "IN"),
    "HYD": ("Hyderabad", "Rajiv Gandhi International Airport", "IN"),
    "GOI": ("Goa", "Dabolim International Airport", "IN"),
    "GOX": ("Goa", "Manohar International Airport", "IN"),
    "COK": ("Kochi", "Cochin International Airport", "IN"),
    "AMD": ("Ahmedabad", "Sardar Vallabhbhai Patel International", "IN"),
    "PNQ": ("Pune", "Pune International Airport", "IN"),
    "JAI": ("Jaipur", "Jaipur International Airport", "IN"),
    "LKO": ("Lucknow", "Chaudhary Charan Singh International", "IN"),
    "GAU": ("Guwahati", "Lokpriya Gopinath Bordoloi International", "IN"),
    "TRV": ("Thiruvananthapuram", "Trivandrum International Airport", "IN"),
    "ATQ": ("Amritsar", "Sri Guru Ram Dass Jee International", "IN"),
    "SXR": ("Srinagar", "Sheikh ul-Alam International Airport", "IN"),
    "IXC": ("Chandigarh", "Shaheed Bhagat Singh International", "IN"),
    "VNS": ("Varanasi", "Lal Bahadur Shastri International", "IN"),
    "BBI": ("Bhubaneswar", "Biju Patnaik International Airport", "IN"),
    "PAT": ("Patna", "Jay Prakash Narayan Airport", "IN"),
    "IXB": ("Bagdogra", "Bagdogra International Airport", "IN"),
    "NAG": ("Nagpur", "Dr. Babasaheb Ambedkar International", "IN"),
    "IXE": ("Mangalore", "Mangaluru International Airport", "IN"),
    "CJB": ("Coimbatore", "Coimbatore International Airport", "IN"),
    "VTZ": ("Visakhapatnam", "Visakhapatnam International Airport", "IN"),
    "IDR": ("Indore", "Devi Ahilyabai Holkar International", "IN"),
    "UDR": ("Udaipur", "Maharana Pratap Airport", "IN"),
    "DXB": ("Dubai", "Dubai International Airport", "AE"),
    "DWC": ("Dubai", "Al Maktoum International Airport", "AE"),
    "DOH": ("Doha", "Hamad International Airport", "QA"),
    "AUH": ("Abu Dhabi", "Zayed International Airport", "AE"),
    "RUH": ("Riyadh", "King Khalid International Airport", "SA"),
    "JED": ("Jeddah", "King Abdulaziz International Airport", "SA"),
    "MCT": ("Muscat", "Muscat International Airport", "OM"),
    "BAH": ("Manama", "Bahrain International Airport", "BH"),
    "KWI": ("Kuwait City", "Kuwait International Airport", "KW"),
    "LHR": ("London", "Heathrow Airport", "GB"),
    "LGW": ("London", "Gatwick Airport", "GB"),
    "STN": ("London", "Stansted Airport", "GB"),
    "CDG": ("Paris", "Paris Charles de Gaulle Airport", "FR"),
    "ORY": ("Paris", "Paris Orly Airport", "FR"),
    "FRA": ("Frankfurt", "Frankfurt Airport", "DE"),
    "MUC": ("Munich", "Munich Airport", "DE"),
    "AMS": ("Amsterdam", "Amsterdam Airport Schiphol", "NL"),
    "ZRH": ("Zurich", "Zurich Airport", "CH"),
    "GVA": ("Geneva", "Geneva Airport", "CH"),
    "FCO": ("Rome", "Leonardo da Vinci–Fiumicino Airport", "IT"),
    "MXP": ("Milan", "Milan Malpensa Airport", "IT"),
    "MAD": ("Madrid", "Adolfo Suárez Madrid–Barajas Airport", "ES"),
    "BCN": ("Barcelona", "Josep Tarradellas Barcelona-El Prat", "ES"),
    "IST": ("Istanbul", "Istanbul Airport", "TR"),
    "VIE": ("Vienna", "Vienna International Airport", "AT"),
    "BRU": ("Brussels", "Brussels Airport", "BE"),
    "DUB": ("Dublin", "Dublin Airport", "IE"),
    "CPH": ("Copenhagen", "Copenhagen Airport", "DK"),
    "ARN": ("Stockholm", "Stockholm Arlanda Airport", "SE"),
    "OSL": ("Oslo", "Oslo Airport Gardermoen", "NO"),
    "ATH": ("Athens", "Athens International Airport", "GR"),
    "LIS": ("Lisbon", "Humberto Delgado Airport", "PT"),
    "JFK": ("New York", "John F. Kennedy International Airport", "US"),
    "EWR": ("Newark", "Newark Liberty International Airport", "US"),
    "LGA": ("New York", "LaGuardia Airport", "US"),
    "LAX": ("Los Angeles", "Los Angeles International Airport", "US"),
    "SFO": ("San Francisco", "San Francisco International Airport", "US"),
    "ORD": ("Chicago", "O'Hare International Airport", "US"),
    "MIA": ("Miami", "Miami International Airport", "US"),
    "BOS": ("Boston", "Boston Logan International Airport", "US"),
    "SEA": ("Seattle", "Seattle-Tacoma International Airport", "US"),
    "IAD": ("Washington", "Washington Dulles International Airport", "US"),
    "DFW": ("Dallas", "Dallas/Fort Worth International", "US"),
    "ATL": ("Atlanta", "Hartsfield-Jackson Atlanta International", "US"),
    "YYZ": ("Toronto", "Toronto Pearson International Airport", "CA"),
    "YVR": ("Vancouver", "Vancouver International Airport", "CA"),
    "YUL": ("Montreal", "Montréal-Trudeau International", "CA"),
    "MEX": ("Mexico City", "Benito Juárez International Airport", "MX"),
    "GRU": ("São Paulo", "São Paulo/Guarulhos International", "BR"),
    "EZE": ("Buenos Aires", "Ministro Pistarini International", "AR"),
    "SIN": ("Singapore", "Singapore Changi Airport", "SG"),
    "BKK": ("Bangkok", "Suvarnabhumi Airport", "TH"),
    "DMK": ("Bangkok", "Don Mueang International Airport", "TH"),
    "HKT": ("Phuket", "Phuket International Airport", "TH"),
    "KUL": ("Kuala Lumpur", "Kuala Lumpur International Airport", "MY"),
    "DPS": ("Bali", "I Gusti Ngurah Rai International Airport", "ID"),
    "CGK": ("Jakarta", "Soekarno-Hatta International Airport", "ID"),
    "HKG": ("Hong Kong", "Hong Kong International Airport", "HK"),
    "HND": ("Tokyo", "Tokyo Haneda Airport", "JP"),
    "NRT": ("Tokyo", "Narita International Airport", "JP"),
    "KIX": ("Osaka", "Kansai International Airport", "JP"),
    "ICN": ("Seoul", "Incheon International Airport", "KR"),
    "TPE": ("Taipei", "Taiwan Taoyuan International Airport", "TW"),
    "SYD": ("Sydney", "Sydney Kingsford Smith Airport", "AU"),
    "MEL": ("Melbourne", "Melbourne Airport", "AU"),
    "BNE": ("Brisbane", "Brisbane Airport", "AU"),
    "PER": ("Perth", "Perth Airport", "AU"),
    "AKL": ("Auckland", "Auckland Airport", "NZ"),
    "MLE": ("Malé", "Velana International Airport", "MV"),
    "CMB": ("Colombo", "Bandaranaike International Airport", "LK"),
    "KTM": ("Kathmandu", "Tribhuvan International Airport", "NP"),
    "CAI": ("Cairo", "Cairo International Airport", "EG"),
    "JNB": ("Johannesburg", "O.R. Tambo International Airport", "ZA"),
    "CPT": ("Cape Town", "Cape Town International Airport", "ZA"),
    "NBO": ("Nairobi", "Jomo Kenyatta International Airport", "KE"),
    "MRU": ("Port Louis", "Sir Seewoosagur Ramgoolam Intl", "MU"),
}


def _require_airport(db: Session, code: str) -> Airport:
    exists = db.get(Airport, code)
    if exists is None:
        info = KNOWN_GLOBAL_AIRPORTS.get(code.upper())
        if info is not None:
            city, name, country = info
            airport = Airport(code=code.upper(), city=city, name=name, country=country)
            db.add(airport)
            db.flush()
            return airport
        raise ServiceError(422, f"Unknown airport code: {code}.", "unknown_airport")
    return exists


def list_airports(db: Session) -> list[AirportPublic]:
    rows = db.scalars(select(Airport).order_by(Airport.city, Airport.code)).all()
    return [AirportPublic.model_validate(row) for row in rows]


def list_destinations(db: Session) -> list[AirportPublic]:
    rows = db.scalars(
        select(Airport).where(Airport.category.is_not(None)).order_by(Airport.city)
    ).all()
    return [AirportPublic.model_validate(row) for row in rows]


def _money(fare: Fare, currency: CurrencyCode, travellers: int) -> Money:
    unit = fare.amount_inr if currency == "INR" else fare.amount_usd
    amount = Decimal(unit).quantize(Decimal("0.01"))
    total = (amount * travellers).quantize(Decimal("0.01"))
    return Money(currency=currency, amount=amount, total=total)


def _offer(fare: Fare, currency: CurrencyCode, travellers: int) -> FlightOffer:
    flight = fare.flight
    return FlightOffer(
        fare_id=fare.id,
        flight_id=flight.id,
        flight_number=flight.flight_number,
        airline=AirlineSummary.model_validate(flight.airline),
        origin=AirportSummary.model_validate(flight.origin),
        destination=AirportSummary.model_validate(flight.destination),
        depart_at=flight.depart_at,
        arrive_at=flight.arrive_at,
        depart_on=flight.depart_on,
        duration_minutes=flight.duration_minutes,
        stops=flight.stops,
        aircraft=flight.aircraft,
        cabin=fare.cabin,  # type: ignore[arg-type]
        seats_available=fare.seats_available,
        price=_money(fare, currency, travellers),
    )


def _sort_offers(
    offers: list[FlightOffer],
    sort: SortKey,
    currency: CurrencyCode,
) -> list[FlightOffer]:
    duration_weight = Decimal("8") if currency == "INR" else Decimal("0.10")

    def best_score(offer: FlightOffer) -> Decimal:
        return offer.price.total + (Decimal(offer.duration_minutes) * duration_weight)

    if sort == "fastest":
        return sorted(
            offers,
            key=lambda offer: (
                offer.duration_minutes,
                offer.depart_at,
                offer.price.total,
            ),
        )
    if sort == "departure":
        return sorted(offers, key=lambda offer: (offer.depart_at, offer.price.total))
    if sort == "best":
        return sorted(offers, key=lambda offer: (best_score(offer), offer.depart_at))
    return sorted(
        offers,
        key=lambda offer: (offer.price.total, offer.duration_minutes, offer.depart_at),
    )


def _search_leg(
    db: Session,
    *,
    origin: str,
    destination: str,
    departure: date,
    cabin: CabinName,
    travellers: int,
    direct_only: bool,
    flexible_dates: bool,
    currency: CurrencyCode,
    sort: SortKey,
) -> list[FlightOffer]:
    start = departure - timedelta(days=3) if flexible_dates else departure
    end = departure + timedelta(days=3) if flexible_dates else departure
    statement = (
        select(Fare)
        .join(Fare.flight)
        .where(
            Flight.origin_code == origin,
            Flight.destination_code == destination,
            Flight.depart_on >= start,
            Flight.depart_on <= end,
            Fare.cabin == cabin,
            Fare.seats_available >= travellers,
        )
        .options(
            joinedload(Fare.flight).joinedload(Flight.airline),
            joinedload(Fare.flight).joinedload(Flight.origin),
            joinedload(Fare.flight).joinedload(Flight.destination),
        )
    )
    if direct_only:
        statement = statement.where(Flight.stops == 0)

    fares = db.scalars(statement).unique().all()
    offers = [_offer(fare, currency, travellers) for fare in fares]
    return _sort_offers(offers, sort, currency)[:50]


def search_flights(
    db: Session,
    *,
    origin: str,
    destination: str,
    departure: date,
    return_date: date | None,
    via: str | None,
    trip_type_raw: str,
    cabin_raw: str,
    travellers: int,
    direct_only: bool,
    flexible_dates: bool,
    currency: CurrencyCode,
    sort_raw: str,
) -> SearchResponse:
    if travellers < 1 or travellers > 9:
        raise ServiceError(422, "Travellers must be between 1 and 9.", "validation_error")

    trip_type = normalize_trip_type(trip_type_raw)
    cabin = normalize_cabin(cabin_raw)
    sort = normalize_sort(sort_raw)
    origin_code = _airport_code(origin, "Origin")
    destination_code = _airport_code(destination, "Destination")
    via_code = _airport_code(via, "Via") if via else None

    if origin_code == destination_code:
        raise ServiceError(422, "Origin and destination must be different.", "validation_error")
    if via_code in {origin_code, destination_code}:
        raise ServiceError(
            422,
            "The next stop must differ from origin and destination.",
            "validation_error",
        )
    if trip_type == "round-trip" and return_date is None:
        raise ServiceError(
            422,
            "A return date is required for round-trip search.",
            "validation_error",
        )
    if return_date is not None and return_date < departure:
        raise ServiceError(422, "Return date cannot be before departure.", "validation_error")

    criteria = SearchCriteria(
        origin=origin_code,
        destination=destination_code,
        via=via_code,
        departure=departure,
        return_date=return_date,
        trip_type=trip_type,
        cabin=cabin,
        travellers=travellers,
        direct_only=direct_only,
        flexible_dates=flexible_dates,
        currency=currency,
        sort=sort,
    )
    if get_settings().app_env != "test":
        from app.services.market import MarketDataError, search_market

        try:
            return search_market(db, criteria)
        except MarketDataError as exc:
            logger.warning("Market fare search failed: %s", exc)
            criteria_notice = str(exc)
    else:
        criteria_notice = None

    for code in (origin_code, destination_code, via_code):
        if code is not None:
            _require_airport(db, code)

    outbound = _search_leg(
        db,
        origin=origin_code,
        destination=via_code or destination_code,
        departure=departure,
        cabin=cabin,
        travellers=travellers,
        direct_only=direct_only,
        flexible_dates=flexible_dates,
        currency=currency,
        sort=sort,
    )
    inbound = None
    onward = None
    if trip_type == "round-trip" and return_date is not None:
        inbound = _search_leg(
            db,
            origin=destination_code,
            destination=origin_code,
            departure=return_date,
            cabin=cabin,
            travellers=travellers,
            direct_only=direct_only,
            flexible_dates=flexible_dates,
            currency=currency,
            sort=sort,
        )
    if trip_type == "multi-city" and via_code is not None:
        onward = _search_leg(
            db,
            origin=via_code,
            destination=destination_code,
            departure=departure,
            cabin=cabin,
            travellers=travellers,
            direct_only=direct_only,
            flexible_dates=flexible_dates,
            currency=currency,
            sort=sort,
        )
    return SearchResponse(
        criteria=criteria,
        outbound=outbound,
        inbound=inbound,
        onward=onward,
        source="catalog",
        notice=criteria_notice,
    )
