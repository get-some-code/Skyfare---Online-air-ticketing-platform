from datetime import UTC, datetime, timedelta
from decimal import Decimal
import uuid

import pytest
from app.models.flight import Fare, Flight
from app.models.user import User


def _setup_flight_and_user(client):
    # Register test user
    email = f"passenger_{uuid.uuid4().hex[:6]}@skyfare.test"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Captain Skyfarer"},
    )
    assert reg.status_code == 201, reg.text
    token = reg.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Search for an outbound flight
    search = client.get(
        "/api/v1/flights/search",
        params={
            "origin": "DEL",
            "destination": "BOM",
            "departure": (datetime.now(UTC) + timedelta(days=10)).strftime("%Y-%m-%d"),
            "tripType": "one-way",
            "travellers": 1,
            "currency": "INR",
        },
    )
    assert search.status_code == 200, search.text
    outbound = search.json()["outbound"][0]
    flight_id = outbound["flight_id"]
    fare_id = outbound["fare_id"]

    return headers, flight_id, fare_id


def test_seat_map_and_addons_endpoints(client):
    headers, flight_id, _ = _setup_flight_and_user(client)

    # 1. Seat Map
    seat_res = client.get(f"/api/v1/bookings/seats/{flight_id}")
    assert seat_res.status_code == 200, seat_res.text
    seat_data = seat_res.json()
    assert seat_data["rows"] == 30
    assert seat_data["layout"] == "3-3"
    assert len(seat_data["seats"]) == 180
    assert any(s["seat_class"] == "emergency_exit" for s in seat_data["seats"])

    # 2. Add-ons
    addons_res = client.get("/api/v1/bookings/addons")
    assert addons_res.status_code == 200, addons_res.text
    addons_data = addons_res.json()
    assert len(addons_data) >= 5
    codes = [a["code"] for a in addons_data]
    assert "BAG_5KG" in codes
    assert "MEAL_HINDU_VEG" in codes
    assert "PRIORITY_BOARDING" in codes


def test_pricing_calculator(client):
    headers, flight_id, fare_id = _setup_flight_and_user(client)

    # Test server-authoritative pricing for Saver vs Flexi vs Executive
    pricing_res = client.post(
        "/api/v1/bookings/pricing",
        json={
            "fare_ids": [fare_id],
            "travellers": 1,
            "currency": "INR",
            "fare_tier": "flexi",
            "seats": [{"flight_id": flight_id, "seat_number": "12A", "price": 850.0}],
            "addons": [{"code": "BAG_5KG", "category": "baggage", "title": "5kg", "price": 1200.0}],
        },
    )
    assert pricing_res.status_code == 200, pricing_res.text
    breakdown = pricing_res.json()
    assert breakdown["currency"] == "INR"
    assert float(breakdown["base_fare"]) > 0
    # Flexi tier provides 50% discount on seats
    assert float(breakdown["seats_fee"]) == 425.0
    assert float(breakdown["addons_fee"]) == 1200.0
    computed_sum = round(
        float(breakdown["base_fare"])
        + float(breakdown["taxes_and_fees"])
        + float(breakdown["seats_fee"])
        + float(breakdown["addons_fee"])
        + float(breakdown["convenience_fee"]),
        2,
    )
    assert float(breakdown["total"]) == computed_sum


def test_full_booking_payment_and_pdf_lifecycle(client):
    headers, flight_id, fare_id = _setup_flight_and_user(client)

    # Step 1: Create booking with seat hold and add-ons
    booking_res = client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "fare_ids": [fare_id],
            "fare_tier": "flexi",
            "currency": "INR",
            "trip_type": "one-way",
            "contact_email": "booking@skyfare.test",
            "contact_phone": "+91 98765 43210",
            "passengers": [
                {
                    "title": "Mr",
                    "first_name": "Arjun",
                    "last_name": "Mehta",
                    "full_name": "Mr Arjun Mehta",
                    "passenger_type": "adult",
                    "gender": "male",
                    "nationality": "Indian",
                }
            ],
            "seats": [
                {
                    "flight_id": flight_id,
                    "passenger_index": 0,
                    "seat_number": "14A",
                    "seat_class": "emergency_exit",
                    "price": 850.0,
                }
            ],
            "addons": [
                {
                    "passenger_index": 0,
                    "code": "MEAL_HINDU_VEG",
                    "category": "meal",
                    "title": "Royal Indian Vegetarian Thali",
                    "price": 380.0,
                }
            ],
        },
    )
    assert booking_res.status_code == 201, booking_res.text
    booking = booking_res.json()
    assert booking["status"] == "SEATS_HELD"
    assert booking["payment_status"] == "pending"
    assert booking["held_until"] is not None
    assert len(booking["seat_reservations"]) == 1
    assert booking["seat_reservations"][0]["seat_number"] == "14A"
    assert len(booking["addons"]) == 1
    reference = booking["reference"]

    # Step 2: Concurrency check - verifying seat 14A is now occupied/held on the seat map
    seat_map_check = client.get(f"/api/v1/bookings/seats/{flight_id}")
    assert seat_map_check.status_code == 200
    seat_14a = next(s for s in seat_map_check.json()["seats"] if s["seat_number"] == "14A")
    assert seat_14a["status"] in ("held", "occupied")

    # Step 3: Attempting to book the SAME seat 14A with another booking should be rejected
    dup_booking = client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "fare_ids": [fare_id],
            "passengers": [{"first_name": "Other", "last_name": "User", "passenger_type": "adult"}],
            "seats": [{"flight_id": flight_id, "seat_number": "14A", "price": 850.0}],
        },
    )
    assert dup_booking.status_code == 409, "Should reject already held seat"

    # Step 4: Pay for the booking (simulated transaction)
    idempotency_key = f"PAY-{uuid.uuid4().hex}"
    pay_res = client.post(
        f"/api/v1/bookings/{reference}/pay",
        headers=headers,
        json={
            "payment_method": "card",
            "card_number": "4111111111114242",
            "card_holder": "Arjun Mehta",
            "expiry_month": "12",
            "expiry_year": "28",
            "cvv": "123",
            "idempotency_key": idempotency_key,
        },
    )
    assert pay_res.status_code == 200, pay_res.text
    pay_data = pay_res.json()
    assert pay_data["status"] == "success"
    assert pay_data["booking"]["status"] == "CONFIRMED"
    assert pay_data["booking"]["payment_status"] == "paid"
    assert pay_data["transaction_ref"].startswith("TXN-")

    # Step 5: Verify booking is now CONFIRMED with confirmed seat reservations
    confirmed_booking = client.get(f"/api/v1/bookings/{reference}", headers=headers).json()
    assert confirmed_booking["status"] == "CONFIRMED"
    assert confirmed_booking["payment_status"] == "paid"
    assert confirmed_booking["seat_reservations"][0]["status"] == "confirmed"

    # Step 6: Download ticket PDF
    pdf_res = client.get(f"/api/v1/bookings/{reference}/ticket.pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF"), "Must be a valid binary PDF"
    assert len(pdf_res.content) > 1000

    # Step 7: Cancel booking and verify refund
    cancel_res = client.post(
        f"/api/v1/bookings/{reference}/cancel",
        headers=headers,
        json={"reason": "Schedule change"},
    )
    assert cancel_res.status_code == 200, cancel_res.text
    cancelled = cancel_res.json()
    assert cancelled["status"] == "CANCELLED"
    assert cancelled["cancellation"] is not None
    assert cancelled["cancellation"]["refund_status"] == "completed"
    assert cancelled["cancellation"]["refund_reference"].startswith("REF-")
