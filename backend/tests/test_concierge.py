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
