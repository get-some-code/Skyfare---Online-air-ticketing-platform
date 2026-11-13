import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings
from app.schemas.concierge import ChatMessage, ChatOption

logger = logging.getLogger(__name__)

AIRPORTS = {
    "del": "DEL",
    "delhi": "DEL",
    "new delhi": "DEL",
    "ccu": "CCU",
    "kolkata": "CCU",
    "calcutta": "CCU",
    "bom": "BOM",
    "mumbai": "BOM",
    "bombay": "BOM",
    "blr": "BLR",
    "bengaluru": "BLR",
    "bangalore": "BLR",
    "goi": "GOI",
    "goa": "GOI",
    "dxb": "DXB",
    "dubai": "DXB",
}

SYSTEM_PROMPT = """You are SkyBot — SkyFare's warm, intelligent female AI flight concierge and digital travel companion.

Core Identity & Voice:
1. Your name is SkyBot (she/her). You represent SkyFare, the premier executive flight booking and commercial charter platform.
2. Tone: Helpful, courteous, professional, and charming. No slang, vulgarity, or trash talk.

FORMATTING RULES:
- Never output double bullet markers or asterisk runs on the same line like "* **Commercial Flights:**".
- Use clean line breaks. Put each point on its own new line starting with "• ".
- Bold key terms naturally with **bold words**, without trailing or dangling asterisks.
- Keep responses concise (under 120 words).

INTERACTIVE OPTIONS:
- When asking the user to choose or provide travel details (such as cabin class, flight type, dates, or next action), DO NOT make them write a long paragraph. Provide 3-5 clean clickable choices at the very end of your message on a new line formatted exactly as:
OPTIONS: [Choice 1 | Choice 2 | Choice 3 | Choice 4]
Example:
OPTIONS: [Economy Class | Business Class | Private Charter | View Flights Now]

Platform Facts:
- SkyFare connects scheduled commercial airlines (via live Google Flights inventory) and private executive charters.
- Cabins: Economy, Premium Economy, Business Class (lie-flat suites, lounge access), and First Class enclosed private suites.
- Privilege Club: SkyFare loyalty tiers (Silver, Gold, Platinum). Platinum members enjoy complimentary lounge access, accelerated miles multipliers, and dedicated priority boarding.
- Corporate Travel & GST: Automated corporate GSTIN billing generates compliant invoices for claiming up to 18% Input Tax Credit (ITC). Zero-fee rescheduling on Flexi fares.
- Baggage Guidelines:
  • Economy: 15-20 kg check-in, 7 kg cabin baggage.
  • Premium Economy: 25 kg check-in, 10 kg cabin baggage.
  • Business Class: 30-35 kg check-in, 12-14 kg cabin baggage.
  • First Class: 40-50 kg check-in, 15 kg cabin baggage.
- Modifications & Cancellations: Accessible 24/7 directly from the 'My Bookings' panel.
- Key Corridors: Kolkata (CCU), New Delhi (DEL), Mumbai (BOM), Bengaluru (BLR), Goa (GOI), Dubai (DXB).
"""


def _detect_route(text: str) -> tuple[str | None, str | None]:
    t = text.lower()
    # Match patterns like "from X to Y" or "X to Y" or "X - Y"
    m = re.search(r"(?:from\s+)?([a-z\s]+?)\s+(?:to|-|->)\s+([a-z\s]+)", t)
    if m:
        w1 = m.group(1).strip()
        w2 = m.group(2).strip()
        orig = next((code for name, code in AIRPORTS.items() if name in w1.split()), None)
        dest = next((code for name, code in AIRPORTS.items() if name in w2.split()), None)
        if orig and dest and orig != dest:
            return orig, dest
    return None, None


def _clean_and_extract_options(raw_text: str, conversation: list[ChatMessage]) -> tuple[str, list[ChatOption]]:
    options: list[ChatOption] = []

    # 1. Extract explicit OPTIONS: [opt1 | opt2]
    opt_match = re.search(r"OPTIONS:\s*\[(.*?)\]", raw_text, re.IGNORECASE | re.DOTALL)
    if opt_match:
        choices = opt_match.group(1).split("|")
        for c in choices:
            label = c.strip().strip('"').strip("'")
            if label:
                options.append(ChatOption(label=label, value=label))
        raw_text = re.sub(r"OPTIONS:\s*\[.*?\]", "", raw_text, flags=re.IGNORECASE | re.DOTALL).strip()

    # 2. Fix awkward asterisks and inline bullet runs
    cleaned = raw_text.replace("* **", "\n• **")
    cleaned = re.sub(r"([a-zA-Z0-9\.\:\?])\s+\*\s+\*\*", r"\1\n• **", cleaned)
    cleaned = re.sub(r"([a-zA-Z0-9\.\:\?])\s+\*\s+", r"\1\n• ", cleaned)
    cleaned = re.sub(r"\n\s*\*\s*", r"\n• ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Remove dangling standalone asterisks
    cleaned = re.sub(r"(?<=\s)\*(?=\s)", "", cleaned)
    cleaned = cleaned.strip()

    # 3. Detect flight route across whole conversation
    all_user_text = " ".join(m.content for m in conversation if m.role == "user")
    orig, dest = _detect_route(all_user_text)

    if orig and dest:
        last_user = next((m.content for m in reversed(conversation) if m.role == "user"), "").lower()
        if any(c in last_user for c in ["business", "economy", "first", "charter"]):
            # User already picked a cabin! Offer date options and direct search link
            options = [
                ChatOption(label="Depart Tomorrow", value="Depart Tomorrow"),
                ChatOption(label="This Weekend", value="This Weekend"),
                ChatOption(label="Flexible Dates", value="Flexible Dates"),
                ChatOption(
                    label=f"✈️ Search {orig} → {dest} Flights",
                    value=f"Search {orig} to {dest}",
                    action="search",
                    url=f"/flights/search?origin={orig}&destination={dest}&cabin=business",
                ),
            ]
        elif not options:
            # First turn after route inquiry: offer cabin class options & instant search
            options = [
                ChatOption(label="Economy Class", value="Economy Class"),
                ChatOption(label="Business Class", value="Business Class"),
                ChatOption(label="First Class Suite", value="First Class Suite"),
                ChatOption(label="Private Charter", value="Private Charter"),
                ChatOption(
                    label=f"✈️ View {orig} → {dest} Fares",
                    value=f"Search {orig} to {dest}",
                    action="search",
                    url=f"/flights/search?origin={orig}&destination={dest}&cabin=business",
                ),
            ]

    return cleaned, options


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
            "I'd love to share the perks of our **SkyFare Privilege Club**!\n\n"
            "• **Accelerated Miles**: Earn miles on every commercial and charter flight\n"
            "• **VIP Lounge Access**: Complimentary worldwide lounge privileges\n"
            "• **Priority Boarding**: Accelerated security and boarding lanes\n"
            "• **Dedicated Support**: 24/7 executive concierge line"
        )
    if any(k in q for k in ["baggage", "luggage", "weight", "allowance", "kilo"]):
        return (
            "SkyFare standard baggage allowances across our partner fleet:\n\n"
            "• **Economy**: 15–20 kg check-in, 7 kg cabin bag\n"
            "• **Premium Economy**: 25 kg check-in, 10 kg cabin bag\n"
            "• **Business Class**: 30–35 kg check-in, 12 kg cabin bag\n"
            "• **First Class Suite**: 40–50 kg check-in, 15 kg cabin bag"
        )
    if any(k in q for k in ["gst", "corporate", "tax", "invoice", "itc"]):
        return (
            "SkyFare provides automated **Corporate GST Reconciliation**.\n\n"
            "By entering your company's GSTIN and entity name during booking, every confirmed ticket "
            "generates a compliant tax invoice enabling your business to claim up to **18% Input Tax Credit (ITC)**. "
            "Corporate reservations also include zero-fee rescheduling on Flexi fares."
        )
    if any(k in q for k in ["cancel", "refund", "reschedule", "change"]):
        return (
            "To review or cancel a reservation, open the **My Bookings** panel from the top navigation.\n\n"
            "• Eligible trips can be cancelled with one click\n"
            "• Refunds are processed immediately to your original payment method\n"
            "• For emergency re-routings, SkyBot and our live team are available 24/7"
        )
    orig, dest = _detect_route(q)
    if orig and dest:
        return (
            f"I would be delighted to find the finest flights from **{orig}** to **{dest}** for you! "
            "Please select your preferred cabin class and travel options below:"
        )
    return (
        "Greetings from SkyFare Executive Concierge. I am at your service to assist with flight availability, "
        "airline cabin classes (Economy, Business, and First Class suites), Privilege Club tier benefits, baggage allowances, "
        "and automated corporate GST invoicing. Please choose an option below or let me know your journey details."
    )


async def _call_groq(messages: list[ChatMessage], api_key: str) -> str:
    groq_messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in messages:
        groq_messages.append({"role": m.role if m.role in ["user", "assistant"] else "user", "content": m.content})

    async with httpx.AsyncClient(timeout=12.0) as client:
        for model in ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"]:
            try:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": groq_messages,
                        "max_tokens": 500,
                        "temperature": 0.5,
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
    contents: list[dict[str, Any]] = []
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
                            "temperature": 0.5,
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


async def chat_with_concierge(messages: list[ChatMessage]) -> tuple[str, str, list[ChatOption]]:
    """
    Dual-model AI fallback:
    1. Try Groq (ultra-fast sub-second LLM)
    2. Fallback to Google Gemini
    3. Final fallback to built-in SkyFare Knowledge Base
    Returns (cleaned_reply, provider_name, options_list)
    """
    settings = get_settings()
    last_user_query = next((m.content for m in reversed(messages) if m.role == "user"), "")

    groq_key = settings.groq_api_key.get_secret_value() if settings.groq_api_key else None
    gemini_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else None

    raw_reply = ""
    provider = "concierge-kb"

    # 1. Attempt Groq
    if groq_key:
        try:
            raw_reply = await _call_groq(messages, groq_key)
            provider = "groq (qwen-3.8-27b)"
        except Exception as e:
            logger.warning("Groq primary attempt failed: %s; falling back to Gemini.", e)

    # 2. Attempt Gemini
    if not raw_reply and gemini_key:
        try:
            raw_reply = await _call_gemini(messages, gemini_key)
            provider = "gemini (gemma-4-26b)"
        except Exception as e:
            logger.warning("Gemini fallback attempt failed: %s; falling back to knowledge base.", e)

    # 3. Intelligent Concierge Knowledge Base
    if not raw_reply:
        raw_reply = _kb_fallback(last_user_query)
        provider = "concierge-kb"

    cleaned_reply, options = _clean_and_extract_options(raw_reply, messages)
    return cleaned_reply, provider, options
