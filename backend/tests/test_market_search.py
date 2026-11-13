from datetime import date
from unittest.mock import MagicMock, patch

from app.schemas.ticketing import SearchCriteria
from app.services.market import MarketDataError, search_market


def test_search_market_mocked_serpapi(client):
    mock_payload = [
        {
            "flights": [
                {
                    "airline": "Air India",
                    "flight_number": "AI 101",
                    "airplane": "Boeing 787",
                    "departure_airport": {"id": "DEL", "name": "Indira Gandhi Intl", "time": "2026-11-20 10:00"},
                    "arrival_airport": {"id": "BOM", "name": "Chhatrapati Shivaji Intl", "time": "2026-11-20 12:15"},
                }
            ],
            "total_duration": 135,
            "price": 5200,
            "type": "Nonstop",
            "airline_logo": "https://example.com/ai.png",
        }
    ]

    criteria = SearchCriteria(
        origin="DEL",
        destination="BOM",
        departure=date(2026, 11, 20),
        trip_type="one-way",
        cabin="economy",
        travellers=1,
        direct_only=False,
        flexible_dates=False,
        currency="INR",
        sort="cheapest",
    )

    with patch("app.services.market._query_serpapi", return_value=mock_payload):
        from app.db.session import SessionLocal

        db = SessionLocal()
        try:
            response = search_market(db, criteria)
            assert response.source == "market"
            assert len(response.outbound) >= 1
            offer = response.outbound[0]
            assert offer.flight_number == "AI 101"
            assert offer.airline.name == "Air India"
            assert offer.price.amount == 5200
            assert offer.price.currency == "INR"
        finally:
            db.close()


def test_search_market_failure_fallback_to_catalog(client):
    criteria = SearchCriteria(
        origin="DEL",
        destination="BOM",
        departure=date(2026, 11, 20),
        trip_type="one-way",
        cabin="economy",
        travellers=1,
        direct_only=False,
        flexible_dates=False,
        currency="INR",
        sort="cheapest",
    )

    with patch("app.services.market._query_serpapi", side_effect=MarketDataError("Rate limited")):
        with patch("app.services.market._query_aviationstack", side_effect=MarketDataError("API error")):
            from app.db.session import SessionLocal

            db = SessionLocal()
            try:
                import pytest
                with pytest.raises(MarketDataError):
                    search_market(db, criteria)
            finally:
                db.close()
