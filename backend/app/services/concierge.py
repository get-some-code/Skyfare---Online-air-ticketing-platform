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
    "maa": "MAA",
    "chennai": "MAA",
    "madras": "MAA",
    "hyd": "HYD",
    "hyderabad": "HYD",
    "goi": "GOI",
    "goa": "GOI",
    "dxb": "DXB",
    "dubai": "DXB",
    "amd": "AMD",
    "ahmedabad": "AMD",
    "pnq": "PNQ",
    "pune": "PNQ",
    "cok": "COK",
    "kochi": "COK",
    "cochin": "COK",
    "jai": "JAI",
    "jaipur": "JAI",
}

AIRPORT_NAMES = {
    "DEL": "New Delhi (DEL)",
    "CCU": "Kolkata (CCU)",
    "BOM": "Mumbai (BOM)",
    "BLR": "Bengaluru (BLR)",
    "MAA": "Chennai (MAA)",
    "HYD": "Hyderabad (HYD)",
    "GOI": "Goa (GOI)",
    "DXB": "Dubai (DXB)",
    "AMD": "Ahmedabad (AMD)",
    "PNQ": "Pune (PNQ)",
    "COK": "Kochi (COK)",
    "JAI": "Jaipur (JAI)",
}

SYSTEM_PROMPT = """You are SkyBot — SkyFare's warm, intelligent female AI flight concierge and digital travel companion.

Core Identity & Voice:
1. Your name is SkyBot (she/her). You represent SkyFare, the premier executive flight booking and commercial charter platform.
2. Tone: Helpful, courteous, professional, and charming. No slang, vulgarity, or trash talk.

CRITICAL FLIGHT SEARCH RULE:
When a user asks for flights or selects travel options (e.g. route, cabin, dates):
- NEVER repeat or ask "Would you like to view the live flight options now?".
- NEVER ask repetitive confirmation questions like "I have locked in your search. Would you like to see options?".
- IMMEDIATELY provide 2 to 3 prominent flight choices with airline name, flight number, departure and arrival times, duration, and fare.
- Direct them to the search link below to view all options.

FORMATTING RULES:
- Never output double bullet markers or asterisk runs on the same line like "* **Commercial Flights:**".
- Use clean line breaks. Put each point on its own new line starting with "• ".
- Bold key terms naturally with **bold words**, without trailing or dangling asterisks.
- Keep responses concise (under 120 words).

MANDATORY INTERACTIVE OPTIONS:
At the very end of EVERY SINGLE RESPONSE you generate, you MUST add a new line with 3 to 4 clickable option pills for the user to choose:
OPTIONS: [Choice 1 | Choice 2 | Choice 3]
"""


def _generate_flight_results(orig: str, dest: str, cabin: str = "Economy", date_desc: str = "This Weekend") -> tuple[str, list[ChatOption]]:
    orig_name = AIRPORT_NAMES.get(orig, f"{orig}")
    dest_name = AIRPORT_NAMES.get(dest, f"{dest}")
    is_business = "business" in cabin.lower()
    is_charter = "charter" in cabin.lower()
    cabin_slug = "business" if is_business else "economy"

    # Route-based baseline duration and pricing
    if dest == "DXB" or orig == "DXB":
        base_eco = 16800
        base_biz = 48500
        dur = "3h 45m"
    elif {orig, dest} <= {"DEL", "BOM", "BLR"}:
        base_eco = 4250
        base_biz = 12500
        dur = "2h 10m"
    elif {orig, dest} <= {"MAA", "CCU"}:
        base_eco = 4650
        base_biz = 13800
        dur = "2h 25m"
    elif {orig, dest} <= {"DEL", "CCU"}:
        base_eco = 3950
        base_biz = 11900
        dur = "2h 15m"
    else:
        base_eco = 4500
        base_biz = 13000
        dur = "2h 30m"

    if is_charter:
        reply = (
            f"Here are the private corporate charter options for **{orig_name} → {dest_name}** ({date_desc}):\n\n"
            f"✈️ **SkyStream Premier Jet (Pilatus PC-24)** · Non-stop ({dur})\n"
            f"• Departure: On-Demand VIP Terminal · Up to 8 executive passengers\n"
            f"• Amenities: High-speed Wi-Fi, lie-flat club seating, dedicated cabin attendant\n"
            f"• Charter Quote: **₹3,85,000** total · All-inclusive with corporate GST\n\n"
            f"✈️ **Gulfstream G650 Ultra-Long** · Non-stop ({dur})\n"
            f"• Departure: Private FBO Apron · Up to 14 passengers\n"
            f"• Amenities: Master stateroom, chef-curated dining, satellite comms\n"
            f"• Charter Quote: **₹7,40,000** total · Zero-notice priority departure"
        )
        options = [
            ChatOption(
                label=f"✈️ View All Flights on SkyFare",
                value=f"Search {orig} to {dest}",
                action="search",
                url=f"/flights/search?origin={orig}&destination={dest}&cabin=business",
            ),
            ChatOption(label="Switch to Commercial Flights", value="Commercial Flights"),
            ChatOption(label="Depart Tomorrow", value="Depart Tomorrow"),
            ChatOption(label="Flexible Dates", value="Flexible Dates"),
        ]
        return reply, options

    if is_business:
        f1_fare = f"₹{base_biz:,}"
        f2_fare = f"₹{base_biz + 1800:,}"
        reply = (
            f"Here are the top **Business Class** flights for **{orig_name} → {dest_name}** ({date_desc}):\n\n"
            f"✈️ **Air India AI-572 (Executive Suite)** · Non-stop ({dur})\n"
            f"• Departs: **07:15 ({orig})** → Arrives: **09:40 ({dest})**\n"
            f"• Aircraft: Airbus A321neo · Lie-flat suite, VIP lounge access & hot gourmet meal\n"
            f"• Baggage: 35 kg check-in + 12 kg cabin · Fare: **{f1_fare}** / person\n\n"
            f"✈️ **IndiGo 6E-6234 (Stretch Class)** · Non-stop ({dur})\n"
            f"• Departs: **14:30 ({orig})** → Arrives: **16:55 ({dest})**\n"
            f"• Aircraft: Airbus A320 · Priority check-in, XL extra legroom & fast track\n"
            f"• Baggage: 30 kg check-in + 10 kg cabin · Fare: **{f2_fare}** / person\n\n"
            f"All confirmed tickets include automated 18% Corporate GST ITC invoices."
        )
        options = [
            ChatOption(
                label=f"✈️ View All 24+ {orig} → {dest} Flights on SkyFare",
                value=f"Search {orig} to {dest}",
                action="search",
                url=f"/flights/search?origin={orig}&destination={dest}&cabin=business",
            ),
            ChatOption(label="Switch to Economy", value="Economy Class"),
            ChatOption(label="Depart Tomorrow", value="Depart Tomorrow"),
            ChatOption(label="Next Week", value="Next Week"),
        ]
        return reply, options

    # Default: Economy Class flights
    f1_fare = f"₹{base_eco:,}"
    f2_fare = f"₹{base_eco + 470:,}"
    f3_fare = f"₹{base_eco - 170:,}"
    reply = (
        f"Here are the top flight options for **{orig_name} → {dest_name}** (Economy Class · {date_desc}):\n\n"
        f"✈️ **IndiGo 6E-6234** · Non-stop ({dur})\n"
        f"• Departs: **06:20 ({orig})** → Arrives: **08:45 ({dest})**\n"
        f"• Aircraft: Airbus A320 · Check-in: 15 kg · Cabin: 7 kg\n"
        f"• Fare: **{f1_fare}** / person · Instant Confirmation\n\n"
        f"✈️ **Air India AI-572** · Non-stop ({dur})\n"
        f"• Departs: **11:15 ({orig})** → Arrives: **13:40 ({dest})**\n"
        f"• Aircraft: Airbus A321neo · Complimentary hot meals included\n"
        f"• Fare: **{f2_fare}** / person · Free web check-in\n\n"
        f"✈️ **SpiceJet SG-302** · Non-stop ({dur})\n"
        f"• Departs: **18:30 ({orig})** → Arrives: **20:55 ({dest})**\n"
        f"• Aircraft: Boeing 737 · Check-in: 15 kg · Cabin: 7 kg\n"
        f"• Fare: **{f3_fare}** / person · Lowest fare guarantee\n\n"
        f"All 24+ scheduled flights, seat layouts, and fare rules are available on SkyFare:"
    )
    options = [
        ChatOption(
            label=f"✈️ View All 24+ {orig} → {dest} Flights on SkyFare",
            value=f"Search {orig} to {dest}",
            action="search",
            url=f"/flights/search?origin={orig}&destination={dest}&cabin={cabin_slug}",
        ),
        ChatOption(label="Switch to Business Class", value="Business Class"),
        ChatOption(label="Depart Tomorrow", value="Depart Tomorrow"),
        ChatOption(label="Next Week", value="Next Week"),
        ChatOption(label="Private Charter", value="Private Charter"),
    ]
    return reply, options


def _detect_route(text: str) -> tuple[str | None, str | None]:
    t = text.lower()
    # Match patterns like "from X to Y" or "X to Y" or "X - Y"
    m = re.search(r"(?:from\s+)?([a-z\s]+?)\s+(?:to|-|->)\s+([a-z\s]+)", t)
    if m:
        w1 = m.group(1).strip()
        w2 = m.group(2).strip()
        orig = None
        dest = None
        # Check longest airport names first
        for name in sorted(AIRPORTS.keys(), key=len, reverse=True):
            if not orig and name in w1:
                orig = AIRPORTS[name]
            if not dest and name in w2:
                dest = AIRPORTS[name]
        if orig and dest and orig != dest:
            return orig, dest

    # Direct code detection (e.g., "del", "ccu")
    words = re.findall(r"\b[a-z]{3}\b", t)
    found_codes = [AIRPORTS[w] for w in words if w in AIRPORTS]
    if len(found_codes) >= 2 and found_codes[0] != found_codes[1]:
        return found_codes[0], found_codes[1]

    return None, None


def _clean_and_extract_options(raw_text: str, conversation: list[ChatMessage]) -> tuple[str, list[ChatOption]]:
    options: list[ChatOption] = []

    # 1. Extract explicit OPTIONS: [opt1 | opt2] from AI reply
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
    cleaned = re.sub(r"(?<=\s)\*(?=\s)", "", cleaned)
    cleaned = cleaned.strip()

    # 3. Detect flight route across whole conversation
    all_user_text = " ".join(m.content for m in conversation if m.role == "user")
    all_convo_text = " ".join(m.content for m in conversation)
    orig, dest = _detect_route(all_user_text)
    if not (orig and dest):
        orig, dest = _detect_route(all_convo_text)

    cleaned_lower = cleaned.lower()
    last_user = next((m.content for m in reversed(conversation) if m.role == "user"), "").lower().strip()
    all_lower = all_convo_text.lower()

    # Detect cabin preference (latest user message takes priority)
    detected_cabin = "Economy"
    if "business" in last_user:
        detected_cabin = "Business"
    elif "charter" in last_user or "private" in last_user:
        detected_cabin = "Charter"
    elif "first" in last_user:
        detected_cabin = "First Class"
    elif "premium" in last_user:
        detected_cabin = "Premium Economy"
    elif "economy" in last_user:
        detected_cabin = "Economy"
    elif "business" in all_lower:
        detected_cabin = "Business"
    elif "charter" in all_lower or "private" in all_lower:
        detected_cabin = "Charter"

    # Detect travel date (latest user message takes priority)
    detected_date = "This Weekend"
    if "tomorrow" in last_user:
        detected_date = "Tomorrow"
    elif "next week" in last_user:
        detected_date = "Next Week"
    elif "weekend" in last_user:
        detected_date = "This Weekend"
    elif "flexible" in last_user:
        detected_date = "Flexible Dates"
    elif "today" in last_user:
        detected_date = "Today"
    elif "tomorrow" in all_lower:
        detected_date = "Tomorrow"
    elif "next week" in all_lower:
        detected_date = "Next Week"
    elif "weekend" in all_lower:
        detected_date = "This Weekend"

    # 4. Check if the user is asking a non-flight informational query (using word boundaries)
    non_flight_keywords = [
        "baggage", "luggage", "weight limit", "gst", "tax invoice", "itc",
        "privilege", "club", "miles", "cancel", "refund", "seat selection",
        "pet", "wheelchair", "wifi", "who are you", "what is your name", "introduce", "hello", "hi", "hey"
    ]
    is_non_flight_query = any(re.search(r"\b" + re.escape(k) + r"\b", last_user) for k in non_flight_keywords)

    # Check if the AI generated a repetitive/looping confirmation question instead of flight results
    is_looping_phrase = any(w in cleaned_lower for w in [
        "would you like to view", "would you like to see", "would you like me to",
        "locked in your search", "confirmed your search", "set your search",
        "updated your search", "shall i fetch", "ready to view", "please let me know if",
        "to provide you with the best options", "once you share these details", "would you prefer",
        "to refine the results"
    ])

    # Check if user made a travel/cabin/date selection or asked for flights
    is_flight_selection = any(c in last_user for c in [
        "commercial flights", "economy class", "business class", "first class",
        "private charter", "this weekend", "depart tomorrow", "next week", "flexible dates",
        "flights", "flight", "search", "tickets", "ticket"
    ])

    has_route_in_user = any(k in last_user for k in [" to ", " - ", " -> "]) or any(
        c in last_user for c in ["del", "ccu", "bom", "blr", "maa", "hyd", "goi", "dxb", "delhi", "kolkata", "mumbai", "bangalore", "chennai", "hyderabad", "goa", "dubai"]
    )

    # 5. IMMEDIATE FLIGHT SEARCH DELIVERY:
    # If route is detected and not a policy question: immediately provide prominent flight cards + direct search link
    if orig and dest and not is_non_flight_query:
        if is_looping_phrase or is_flight_selection or has_route_in_user:
            return _generate_flight_results(orig, dest, cabin=detected_cabin, date_desc=detected_date)

    # 6. Fallback options generation when not an immediate flight search
    if not options:
        if any(w in cleaned_lower for w in ["cabin class", "preferred cabin", "select your preferred cabin", "which class"]):
            options = [
                ChatOption(label="Economy Class", value="Economy Class"),
                ChatOption(label="Premium Economy", value="Premium Economy"),
                ChatOption(label="Business Class", value="Business Class"),
                ChatOption(label="First Class Suite", value="First Class Suite"),
            ]
        elif any(w in cleaned_lower for w in ["commercial or private", "travel style", "charter or commercial"]):
            options = [
                ChatOption(label="Commercial Flights", value="Commercial Flights"),
                ChatOption(label="Private Charter", value="Private Charter"),
            ]
        elif any(w in cleaned_lower for w in ["date", "timing", "when would you like", "preferred dates", "depart"]):
            options = [
                ChatOption(label="Depart Tomorrow", value="Depart Tomorrow"),
                ChatOption(label="This Weekend", value="This Weekend"),
                ChatOption(label="Next Week", value="Next Week"),
                ChatOption(label="Flexible Dates", value="Flexible Dates"),
            ]
        elif orig and dest:
            options = [
                ChatOption(label="Commercial Flights", value="Commercial Flights"),
                ChatOption(label="Economy Class", value="Economy Class"),
                ChatOption(label="Business Class", value="Business Class"),
                ChatOption(label="Private Charter", value="Private Charter"),
            ]
        elif any(k in cleaned_lower for k in ["baggage", "allowance", "luggage"]):
            options = [
                ChatOption(label="Economy Limits (15kg)", value="Economy baggage rules"),
                ChatOption(label="Business Limits (35kg)", value="Business class baggage rules"),
                ChatOption(label="Excess Baggage Rates", value="How to pre-book excess baggage"),
            ]
        elif any(k in cleaned_lower for k in ["privilege", "club", "miles", "loyalty"]):
            options = [
                ChatOption(label="Silver Tier Benefits", value="Silver tier benefits"),
                ChatOption(label="Gold Tier Benefits", value="Gold tier benefits"),
                ChatOption(label="Platinum Lounge Perks", value="Platinum lounge perks"),
            ]
        elif any(k in cleaned_lower for k in ["gst", "corporate", "tax", "itc"]):
            options = [
                ChatOption(label="How to Add GSTIN", value="How to add corporate GSTIN"),
                ChatOption(label="18% ITC Tax Invoices", value="18% ITC corporate tax invoice details"),
                ChatOption(label="Zero-Fee Flexi Reschedule", value="Corporate flexi reschedule rules"),
            ]
        else:
            options = [
                ChatOption(label="Search Flights", value="Help me find flights"),
                ChatOption(label="Baggage Allowances", value="What are the baggage allowances?"),
                ChatOption(label="Privilege Club", value="Tell me about Privilege Club"),
                ChatOption(label="Corporate GST", value="How does Corporate GST invoicing work?"),
            ]

    # 7. If route was detected, ensure a direct 1-click search link option is included
    if orig and dest and not any(o.action == "search" for o in options):
        cabin_slug = "business" if "business" in detected_cabin.lower() else "economy"
        options.insert(
            0,
            ChatOption(
                label=f"✈️ View All Flights {orig} → {dest}",
                value=f"Search {orig} to {dest}",
                action="search",
                url=f"/flights/search?origin={orig}&destination={dest}&cabin={cabin_slug}",
            ),
        )

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
        reply, _ = _generate_flight_results(orig, dest)
        return reply
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
