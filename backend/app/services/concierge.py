import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.schemas.concierge import ChatMessage

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are SkyBot — SkyFare's warm, intelligent female AI flight concierge and digital travel companion.

Core Identity & Voice:
1. Your name is SkyBot (she/her). You represent SkyFare, the premier executive flight booking and commercial charter platform.
2. When greeted or when introduced (or when asked who you are), warmly welcome the traveler, introduce yourself as SkyBot ("Hello! I am SkyBot, your 24/7 personal flight concierge at SkyFare! I am here to help you plan your journey, answer flight queries, baggage allowances, lounge perks, corporate GST, and booking management."), speaking with warmth, elegance, and professional charm.
3. Tone: Helpful, courteous, professional, and knowledgeable. Strictly NO slang, vulgarity, or trash talk. Keep answers focused on commercial aviation, executive travel, and platform features.

Platform Facts:
- SkyFare connects scheduled commercial airlines (via live Google Flights inventory) and private executive charters.
- Cabins: Economy, Premium Economy, Business Class (lie-flat suites, lounge access), and First Class enclosed private suites.
- Privilege Club: SkyFare loyalty tiers (Silver, Gold, Platinum). Platinum members enjoy complimentary lounge access, accelerated miles multipliers, and dedicated priority boarding.
- Corporate Travel & GST: Automated corporate GSTIN billing generates compliant invoices for claiming up to 18% Input Tax Credit (ITC). Zero-fee rescheduling on Flexi fares.
- Baggage Guidelines:
  * Economy: 15-20 kg check-in, 7 kg cabin baggage.
  * Premium Economy: 25 kg check-in, 10 kg cabin baggage.
  * Business Class: 30-35 kg check-in, 12-14 kg cabin baggage.
  * First Class: 40-50 kg check-in, 15 kg cabin baggage.
- Modifications & Cancellations: Accessible 24/7 directly from the 'My Bookings' panel.
- Key Corridors: Kolkata (CCU), New Delhi (DEL), Mumbai (BOM), Bengaluru (BLR), Goa (GOI), Dubai (DXB).

Formatting: Use clean, concise bullet points or short elegant paragraphs. Keep answers under 180 words unless deep detail is specifically requested.
"""


def _kb_fallback(query: str) -> str:
    q = query.lower()
    if any(k in q for k in ["who are you", "what is your name", "introduce", "hello", "hi", "hey"]):
        return (
            "Hello! I am **SkyBot**, your 24/7 personal flight concierge at SkyFare! ✈️✨ "
            "I'm here to help you discover executive flights, check real-time baggage allowances, "
            "manage bookings, unlock Privilege Club perks, and assist with corporate GST invoices. "
            "How may I assist your journey today?"
        )
    if any(k in q for k in ["privilege", "club", "loyalty", "tier", "mile"]):
        return (
            "I'd love to share the perks of our **SkyFare Privilege Club**! "
            "Members earn accelerated miles on every commercial and charter flight, enjoy priority terminal boarding, "
            "complimentary VIP lounge access worldwide, and dedicated priority support. "
            "You can enroll instantly or view your miles balance from the top navigation profile menu."
        )
    if any(k in q for k in ["baggage", "luggage", "weight", "allowance", "kilo"]):
        return (
            "SkyFare standard baggage allowances across our partner fleet:\n\n"
            "• **Economy**: 15–20 kg check-in, 7 kg cabin bag\n"
            "• **Premium Economy**: 25 kg check-in, 10 kg cabin bag\n"
            "• **Business Class**: 30–35 kg check-in, 12 kg cabin bag\n"
            "• **First Class Suite**: 40–50 kg check-in, 15 kg cabin bag\n\n"
            "Excess baggage allowances can also be pre-booked at preferential rates during checkout."
        )
    if any(k in q for k in ["gst", "corporate", "tax", "invoice", "itc"]):
        return (
            "SkyFare provides automated **Corporate GST Reconciliation**. By inputting your company's GSTIN and entity name "
            "during registration or checkout, every confirmed reservation generates a verified tax invoice enabling your enterprise "
            "to claim up to 18% Input Tax Credit (ITC). Corporate bookings also feature zero-fee date modifications on Flexi fares."
        )
    if any(k in q for k in ["cancel", "refund", "reschedule", "change"]):
        return (
            "To review or cancel a reservation, open the **My Bookings** panel from the top navigation. "
            "Eligible trips can be cancelled with one click, and refunds are credited back to your original payment method. "
            "For emergency flight re-routings or schedule adjustments, our 24/7 Concierge Desk is always at your service."
        )
    if any(k in q for k in ["dubai", "dxb", "goa", "delhi", "mumbai", "kolkata", "bengaluru", "dest"]):
        return (
            "SkyFare operates scheduled executive frequencies across premier corridors including "
            "**Kolkata (CCU) ↔ Dubai (DXB)**, **Delhi (DEL) ↔ Mumbai (BOM)**, and coastal chartered retreats to **Goa (GOI)**. "
            "Use our live search panel to compare non-stop and luxury suite availability with guaranteed pricing."
        )
    return (
        "Greetings from SkyFare Executive Concierge. I am at your service to assist with flight availability, "
        "airline cabin classes (Economy, Business, and First Class suites), Privilege Club tier benefits, baggage allowances, "
        "and automated corporate GST invoicing. Please let me know how I may tailor your journey today."
    )


async def _call_groq(messages: list[ChatMessage], api_key: str) -> str:
    groq_messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in messages:
        groq_messages.append({"role": m.role if m.role in ["user", "assistant"] else "user", "content": m.content})

    async with httpx.AsyncClient(timeout=12.0) as client:
        # Try primary fast model, fall back to secondary on Groq
        for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": groq_messages,
                        "max_tokens": 500,
                        "temperature": 0.6,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        return content.strip()
            except Exception as e:
                logger.warning("Groq model %s error: %s", model, e)
                continue
    raise RuntimeError("All Groq models failed or timed out.")


async def _call_gemini(messages: list[ChatMessage], api_key: str) -> str:
    # Build conversation context for Gemini
    contents: list[dict[str, Any]] = []
    # Include system instructions in the opening turn
    conversation_summary = f"[System Context: {SYSTEM_PROMPT}]\n\n"
    for m in messages:
        role = "user" if m.role == "user" else "model"
        text = conversation_summary + m.content if not contents and m.role == "user" else m.content
        contents.append({"role": role, "parts": [{"text": text}]})

    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in ["gemma-4-26b-a4b-it", "gemini-flash-latest", "gemini-2.5-flash", "gemini-pro-latest"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                resp = await client.post(
                    url,
                    json={
                        "contents": contents,
                        "generationConfig": {
                            "maxOutputTokens": 500,
                            "temperature": 0.6,
                        },
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0] and parts[0]["text"].strip():
                        return parts[0]["text"].strip()
            except Exception as e:
                logger.warning("Gemini model %s error: %s", model, e)
                continue
    raise RuntimeError("All Gemini models failed or timed out.")


async def chat_with_concierge(messages: list[ChatMessage]) -> tuple[str, str]:
    """
    Dual-model AI fallback:
    1. Try Groq (ultra-fast sub-second LLM)
    2. Fallback to Google Gemini
    3. Final fallback to built-in SkyFare Knowledge Base
    """
    settings = get_settings()
    last_user_query = next((m.content for m in reversed(messages) if m.role == "user"), "")

    groq_key = settings.groq_api_key.get_secret_value() if settings.groq_api_key else None
    gemini_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else None

    # 1. Attempt Groq
    if groq_key:
        try:
            reply = await _call_groq(messages, groq_key)
            return reply, "groq (qwen-3.8-27b)"
        except Exception as e:
            logger.warning("Groq primary attempt failed: %s; falling back to Gemini.", e)

    # 2. Attempt Gemini
    if gemini_key:
        try:
            reply = await _call_gemini(messages, gemini_key)
            return reply, "gemini (gemma-4-26b)"
        except Exception as e:
            logger.warning("Gemini fallback attempt failed: %s; falling back to knowledge base.", e)

    # 3. Intelligent Concierge Knowledge Base
    reply = _kb_fallback(last_user_query)
    return reply, "concierge-kb"
