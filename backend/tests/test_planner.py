import pytest
from app.services.planner import check_rate_limit, _user_plan_requests
from app.core.exceptions import ServiceError


def _get_auth_headers(client, email="planner_user@example.com"):
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Trip Explorer",
            "email": email,
            "password": "secure-planner-pass",
            "phone": "9876543211",
        },
    )
    if reg.status_code == 201:
        token = reg.json()["tokens"]["access_token"]
    else:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "secure-planner-pass"},
        )
        token = login.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_planner_requires_authentication(client):
    # Missing token -> 401
    chat_resp = client.post("/api/v1/planner/chat", json={"message": "Manali 5 days"})
    assert chat_resp.status_code == 401

    gen_resp = client.post(
        "/api/v1/planner/generate",
        json={"state": {"destination": "Manali", "days": 5, "origin_city": "Kolkata"}},
    )
    assert gen_resp.status_code == 401


def test_planner_chat_turn(client):
    headers = _get_auth_headers(client, "user_chat@example.com")
    resp = client.post(
        "/api/v1/planner/chat",
        headers=headers,
        json={
            "message": "Manali, 5 days, from Kolkata, mid-range, vegetarian",
            "state": {},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "state" in data
    assert data["state"]["destination"] is not None
    assert data["progress_percent"] > 0
    assert "chips" in data
    assert isinstance(data["chips"], list)


def test_planner_rate_limiting():
    user_id = "test_rate_limited_user"
    _user_plan_requests[user_id].clear()

    # 10 allowed
    for _ in range(10):
        check_rate_limit(user_id, action="generate")

    # 11th should raise ServiceError(429)
    with pytest.raises(ServiceError) as exc_info:
        check_rate_limit(user_id, action="generate")
    assert exc_info.value.status_code == 429
    assert "Rate limit reached" in exc_info.value.message


def test_planner_generate_endpoint_schema(client, monkeypatch):
    headers = _get_auth_headers(client, "user_gen@example.com")

    # Mock AI provider response for deterministic test execution
    async def mock_gemini_json(*args, **kwargs):
        return {
            "overview": "Curated 5-day mountain escape to Manali featuring high passes and serene valleys.",
            "best_time": "May to June and September to October",
            "arrival": {
                "recommended": "Bhuntar Airport (KUU) or Chandigarh International (IXC)",
                "reason": "IXC offers comprehensive connectivity with scenic NH3 road transit.",
                "alternatives": ["Kullu Bhuntar (KUU)", "New Delhi (DEL)"],
                "onward_transport": [
                    {"mode": "Volvo Semi-Sleeper Bus", "duration": "8h 30m", "cost_inr": "₹1,200 - ₹1,800"},
                    {"mode": "Private Taxi", "duration": "7h 00m", "cost_inr": "₹5,500 - ₹7,000"}
                ]
            },
            "route_summary": "Chandigarh to Bilaspur, Mandi, Kullu, and Manali along NH21 / NH3.",
            "days": [
                {
                    "day": 1,
                    "title": "Arrival and Old Manali Heritage",
                    "stops": [
                        {
                            "time": "10:00 AM",
                            "place": "Hadimba Devi Temple",
                            "type": "Heritage Temple",
                            "what_to_do": "Explore cedar forest and pagoda wood carvings.",
                            "duration": "1h 30m",
                            "cost_inr": "₹50 - ₹100",
                            "tip": "Arrive early to avoid queues."
                        }
                    ],
                    "food": [
                        {
                            "name": "Cafe 1947",
                            "cuisine": "Italian & Himachali",
                            "veg_friendly": True,
                            "cost_per_person_inr": "₹600 - ₹900"
                        }
                    ],
                    "transport": "Local auto-rickshaw or walking along Old Manali road"
                }
            ],
            "budget": {
                "low": {"local_travel": "₹2,500", "stay": "₹6,000", "food": "₹4,000", "sightseeing": "₹1,500", "activities": "₹2,000", "misc": "₹1,500", "total": "₹17,500"},
                "medium": {"local_travel": "₹6,000", "stay": "₹15,000", "food": "₹8,000", "sightseeing": "₹3,000", "activities": "₹5,000", "misc": "₹3,000", "total": "₹40,000"},
                "high": {"local_travel": "₹12,000", "stay": "₹35,000", "food": "₹16,000", "sightseeing": "₹6,000", "activities": "₹10,000", "misc": "₹6,000", "total": "₹85,000"},
                "approx_flights_inr": "₹7,500 - ₹12,000"
            },
            "indian_traveller": {
                "visa_or_permits": "Rohtang Pass vehicle permit required via HP Tourism portal.",
                "money": "ATMs available on Mall Road; keep ₹3,000 cash for high mountain kiosks.",
                "connectivity": "Airtel and Jio offer robust 4G/5G; BSNL works well in remote valleys.",
                "power": "Standard Indian 3-pin Type D and 2-pin Type C plugs (230V).",
                "food": "Widespread pure vegetarian and Jain restaurants across Mall Road.",
                "safety": "Check monsoon landslide advisories; carry AMS medication for high passes."
            },
            "seasonal_advisory": [
                "Rohtang Pass remains closed during peak winter from November to April.",
                "Monsoon months of July and August carry heavy rainfall risks."
            ],
            "flight_search": {
                "origin_iata": "CCU",
                "destination_iata": "IXC",
                "depart_date": "2026-12-15",
                "return_date": "2026-12-20",
                "passengers": 1
            },
            "disclaimer": "Details are AI-generated estimates. Please verify opening hours, permits, visa requirements, and prices before booking."
        }

    from app.services import planner
    monkeypatch.setattr(planner, "call_gemini_json", mock_gemini_json)

    resp = client.post(
        "/api/v1/planner/generate",
        headers=headers,
        json={
            "state": {
                "destination": "Manali",
                "days": 1,
                "origin_city": "Kolkata",
                "budget_tier": "mid-range",
                "food_preference": "vegetarian"
            }
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "plan" in data
    assert data["provider"] == "gemini"
    plan = data["plan"]
    assert plan["overview"] is not None
    assert plan["budget"]["medium"]["total"] == "₹40,000"
    assert len(plan["days"]) == 1
    assert plan["flight_search"]["origin_iata"] == "CCU"
