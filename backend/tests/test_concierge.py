def test_concierge_chat_endpoint(client):
    response = client.post(
        "/api/v1/concierge/chat",
        json={
            "messages": [
                {"role": "user", "content": "How does Corporate GST invoicing work on SkyFare?"}
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 20
    assert data["status"] == "ok"
    assert data["provider"] in ["groq (qwen-3.8-27b)", "gemini (gemma-4-26b)", "concierge-kb", "concierge-guardrail"]


def test_concierge_guardrail_blocks_off_topic_queries(client):
    response = client.post(
        "/api/v1/concierge/chat",
        json={
            "messages": [
                {"role": "user", "content": "who won 2019 worldcup?"}
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["provider"] == "concierge-guardrail"
    reply_lower = data["reply"].lower()
    # Must refuse and steer back to flights and travel
    assert "aviation" in reply_lower or "flight" in reply_lower or "travel" in reply_lower
    assert "england" not in reply_lower
    assert "super over" not in reply_lower
    # Must provide travel-oriented options
    labels = [o["label"] for o in data["options"]]
    assert any("Flight" in l or "Route" in l or "Itinerary" in l for l in labels)


def test_concierge_itinerary_and_routes_allowed(client):
    response = client.post(
        "/api/v1/concierge/chat",
        json={
            "messages": [
                {"role": "user", "content": "suggest suitable routes and 3-day itinerary for Goa"}
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert len(data["options"]) > 0


def test_concierge_sports_gear_with_flight_baggage_allowed(client):
    response = client.post(
        "/api/v1/concierge/chat",
        json={
            "messages": [
                {"role": "user", "content": "can I carry a cricket bat in checked baggage on a flight?"}
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    # Should NOT be blocked as off-topic because of flight + baggage context
    assert data["provider"] != "concierge-guardrail" or "baggage" in data["reply"].lower()


def test_concierge_flight_options(client):
    response = client.post(
        "/api/v1/concierge/chat",
        json={
            "messages": [
                {"role": "user", "content": "del to ccu flights"}
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "options" in data
    assert len(data["options"]) > 0
    labels = [o["label"] for o in data["options"]]
    assert any("Business" in l or "Economy" in l or "DEL" in l for l in labels)
