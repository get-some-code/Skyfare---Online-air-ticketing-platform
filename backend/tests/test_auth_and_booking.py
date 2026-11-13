from datetime import datetime, timedelta
from zoneinfo import ZoneInfo


def _departure():
    return datetime.now(ZoneInfo("Asia/Kolkata")).date() + timedelta(days=1)


def _register(client, email="aviator@example.com"):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Ava Pilot",
            "email": email,
            "password": "correct-horse",
            "phone": "9876543210",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_register_login_and_profile(client):
    created = _register(client)
    assert created["user"]["email"] == "aviator@example.com"
    assert created["tokens"]["token_type"] == "bearer"

    duplicate = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Ava Pilot",
            "email": "aviator@example.com",
            "password": "correct-horse",
        },
    )
    assert duplicate.status_code == 409

    logged_in = client.post(
        "/api/v1/auth/login",
        json={"email": "Aviator@example.com", "password": "correct-horse"},
    )
    assert logged_in.status_code == 200
    access_token = logged_in.json()["tokens"]["access_token"]
    refresh_token = logged_in.json()["tokens"]["refresh_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Ava Pilot"

    updated = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"company_name": "SkyFare Labs", "gstin": "22AAAAA0000A1Z5"},
    )
    assert updated.status_code == 200
    assert updated.json()["gstin"] == "22AAAAA0000A1Z5"

    refreshed = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert reused.status_code == 401

    logout = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refreshed.json()["refresh_token"]},
    )
    assert logout.status_code == 204


def test_rejected_credentials_and_missing_token(client):
    _register(client)
    bad_password = client.post(
        "/api/v1/auth/login",
        json={"email": "aviator@example.com", "password": "wrong-password"},
    )
    assert bad_password.status_code == 401
    assert bad_password.json()["code"] == "invalid_credentials"

    anonymous = client.get("/api/v1/bookings")
    assert anonymous.status_code == 401


def test_search_and_booking_round_trip(client):
    departure = _departure().isoformat()
    return_date = (_departure() + timedelta(days=3)).isoformat()
    search = client.get(
        "/api/v1/flights/search",
        params={
            "origin": "ccu",
            "destination": "DEL",
            "departure": departure,
            "return": return_date,
            "tripType": "round-trip",
            "cabin": "Business / Flexi",
            "travellers": 1,
            "directOnly": "true",
            "currency": "INR",
            "sort": "cheapest",
        },
    )
    assert search.status_code == 200, search.text
    body = search.json()
    assert body["criteria"]["cabin"] == "business"
    assert body["outbound"]
    assert body["inbound"]
    assert all(offer["stops"] == 0 for offer in body["outbound"])
    outbound_fare = body["outbound"][0]["fare_id"]
    inbound_fare = body["inbound"][0]["fare_id"]
    seats_before = body["outbound"][0]["seats_available"]

    account = _register(client, email="booker@example.com")
    token = account["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    booking = client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "fare_ids": [outbound_fare, inbound_fare],
            "passengers": [{"full_name": "Ava Pilot"}],
            "currency": "INR",
            "trip_type": "round-trip",
            "corporate_travel": True,
        },
    )
    assert booking.status_code == 201, booking.text
    reserved = booking.json()
    assert reserved["status"] == "reserved"
    assert reserved["payment_status"] == "unpaid"
    assert len(reserved["segments"]) == 2
    reference = reserved["reference"]

    listed = client.get("/api/v1/bookings", headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["reference"] == reference

    membership = client.get("/api/v1/auth/membership", headers=headers)
    assert membership.status_code == 200
    assert membership.json()["miles"] > 0

    cancelled = client.post(f"/api/v1/bookings/{reference}/cancel", headers=headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"

    researched = client.get(
        "/api/v1/flights/search",
        params={
            "origin": "CCU",
            "destination": "DEL",
            "departure": departure,
            "cabin": "business",
            "directOnly": "true",
        },
    )
    restored = next(
        offer for offer in researched.json()["outbound"] if offer["fare_id"] == outbound_fare
    )
    assert restored["seats_available"] == seats_before


def test_catalog_lists_seeded_airports(client):
    airports = client.get("/api/v1/airports")
    assert airports.status_code == 200
    codes = {airport["code"] for airport in airports.json()}
    assert {"CCU", "DEL", "DXB"} <= codes

    unknown = client.get(
        "/api/v1/flights/search",
        params={"origin": "ZZZ", "destination": "DEL", "departure": _departure().isoformat()},
    )
    assert unknown.status_code == 422
    assert unknown.json()["code"] == "unknown_airport"
