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
    assert data["provider"] in ["groq (qwen-3.8-27b)", "gemini (gemma-4-26b)", "concierge-kb"]


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
