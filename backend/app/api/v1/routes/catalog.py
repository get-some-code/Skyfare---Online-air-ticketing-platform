from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ticketing import AirportPublic, SearchResponse
from app.services import search as search_service

router = APIRouter()


@router.get("/airports", response_model=list[AirportPublic])
def airports(db: Session = Depends(get_db)) -> list[AirportPublic]:
    return search_service.list_airports(db)


@router.get("/destinations", response_model=list[AirportPublic])
def destinations(db: Session = Depends(get_db)) -> list[AirportPublic]:
    return search_service.list_destinations(db)


@router.get("/flights/search", response_model=SearchResponse)
def search_flights(
    origin: str = Query(min_length=3, max_length=3),
    destination: str = Query(min_length=3, max_length=3),
    departure: date = Query(),
    return_date: date | None = Query(default=None, alias="return"),
    via: str | None = Query(default=None, min_length=3, max_length=3),
    trip_type: str = Query(default="one-way", alias="tripType"),
    cabin: str = Query(default="economy"),
    travellers: int = Query(default=1, ge=1, le=9),
    direct_only: bool = Query(default=False, alias="directOnly"),
    flexible_dates: bool = Query(default=False, alias="flexibleDates"),
    currency: Literal["INR", "USD"] = Query(default="INR"),
    sort: str = Query(default="cheapest"),
    db: Session = Depends(get_db),
) -> SearchResponse:
    return search_service.search_flights(
        db,
        origin=origin,
        destination=destination,
        departure=departure,
        return_date=return_date,
        via=via,
        trip_type_raw=trip_type,
        cabin_raw=cabin,
        travellers=travellers,
        direct_only=direct_only,
        flexible_dates=flexible_dates,
        currency=currency,
        sort_raw=sort,
    )
