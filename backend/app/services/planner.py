import asyncio
import logging
import time
from collections import defaultdict
from typing import Any

from app.core.exceptions import ServiceError
from app.schemas.planner import (
    DayPlan,
    FlightSearchPrefill,
    PlannerChatResponse,
    TripPlan,
    TripState,
)
from app.services.ai_providers import (
    AIProviderError,
    call_gemini_json,
    call_groq_json,
)

logger = logging.getLogger(__name__)

# In-memory sliding window rate limiter: user_id -> list of timestamps
_PLAN_LIMIT_HOURLY = 10
_CHAT_LIMIT_HOURLY = 60
_user_plan_requests: dict[str, list[float]] = defaultdict(list)
_user_chat_requests: dict[str, list[float]] = defaultdict(list)

# Known Indian domestic and key international IATA codes for validation
VALID_AIRPORTS = {
    "del": "DEL", "delhi": "DEL", "new delhi": "DEL",
    "bom": "BOM", "mumbai": "BOM",
    "ccu": "CCU", "kolkata": "CCU",
    "blr": "BLR", "bengaluru": "BLR", "bangalore": "BLR",
    "maa": "MAA", "chennai": "MAA",
    "hyd": "HYD", "hyderabad": "HYD",
    "goi": "GOI", "goa": "GOI", "gox": "GOX",
    "cok": "COK", "kochi": "COK",
    "dxb": "DXB", "dubai": "DXB",
    "sin": "SIN", "singapore": "SIN",
    "bkk": "BKK", "bangkok": "BKK",
    "fra": "FRA", "frankfurt": "FRA",
    "muc": "MUC", "munich": "MUC",
    "ber": "BER", "berlin": "BER",
    "lhr": "LHR", "london": "LHR",
    "cdg": "CDG", "paris": "CDG",
    "zrh": "ZRH", "zurich": "ZRH",
    "hnd": "HND", "nrt": "NRT", "tokyo": "HND",
    "ixc": "IXC", "chandigarh": "IXC",
    "kul": "KUL", "kuala lumpur": "KUL",
    "doh": "DOH", "doha": "DOH",
    "ixl": "IXL", "leh": "IXL",
    "sxr": "SXR", "srinagar": "SXR",
}


def check_rate_limit(user_id: str, action: str = "chat") -> None:
    now = time.time()
    cutoff = now - 3600.0

    if action == "generate":
        timestamps = _user_plan_requests[user_id]
        _user_plan_requests[user_id] = [t for t in timestamps if t > cutoff]
        if len(_user_plan_requests[user_id]) >= _PLAN_LIMIT_HOURLY:
            raise ServiceError(
                429,
                f"Rate limit reached. You can generate up to {_PLAN_LIMIT_HOURLY} plans per hour. Please try again later.",
                "rate_limit_exceeded",
            )
        _user_plan_requests[user_id].append(now)
    else:
        timestamps = _user_chat_requests[user_id]
        _user_chat_requests[user_id] = [t for t in timestamps if t > cutoff]
        if len(_user_chat_requests[user_id]) >= _CHAT_LIMIT_HOURLY:
            raise ServiceError(
                429,
                f"Rate limit reached. You can ask up to {_CHAT_LIMIT_HOURLY} questions per hour. Please wait a moment.",
                "rate_limit_exceeded",
            )
        _user_chat_requests[user_id].append(now)


PLANNER_EXTRACTOR_SYSTEM_PROMPT = """You are SkyFare's intelligent Trip Planner Assistant.
Your job is to parse the user's latest message and conversation state, extract trip parameters, and determine if enough details exist to generate a trip plan.

CRITICAL RULES:
1. No emojis anywhere.
2. Output JSON only.
3. Allowed trip parameters:
   - destination (e.g. Manali, Germany, Switzerland, Goa)
   - trip_type ("domestic" or "international")
   - origin_city (e.g. Kolkata, Delhi, Mumbai, Bengaluru)
   - days (integer count of days, minimum 1, maximum 14)
   - dates_or_month (e.g. "May", "next month", "15-22 June")
   - budget_tier ("budget", "mid-range", or "premium")
   - group_type ("solo", "couple", "family", "friends")
   - food_preference ("vegetarian", "non-vegetarian", "jain", "halal")
   - pace ("relaxed", "balanced", "packed")
   - interests (list of strings: "mountains", "passes and tunnels", "temples", "waterfalls", "lakes and rivers", "viewpoints", "food", "adventure", "heritage", "relaxation")

REQUIRED FIELDS TO BE READY:
A plan is ready to generate when at least:
- destination
- days
- origin_city
- budget_tier
are known. If these 4 are known (or if user provided sufficient details in their prompt), set "is_ready_to_generate": true.

If not ready, identify the 1 or 2 most important missing fields, formulate a concise, professional clarifying question, and provide 3-6 clickable chips.

JSON OUTPUT STRUCTURE:
{
  "state": {
    "destination": string or null,
    "trip_type": "domestic" | "international" | null,
    "origin_city": string or null,
    "days": integer or null,
    "dates_or_month": string or null,
    "budget_tier": "budget" | "mid-range" | "premium" | null,
    "total_budget_inr": string or null,
    "group_type": "solo" | "couple" | "family" | "friends" | null,
    "group_size": integer or null,
    "interests": [string],
    "food_preference": "vegetarian" | "non-vegetarian" | "jain" | "halal" | null,
    "pace": "relaxed" | "balanced" | "packed" | null
  },
  "question": string or null,
  "chips": [string],
  "is_ready_to_generate": boolean,
  "missing_fields": [string]
}
"""


PLAN_GENERATION_SYSTEM_PROMPT = """You are SkyFare's Executive Trip Architect.
You generate hyper-specific, pinpoint trip itineraries and budgets for discerning travellers.

MANDATORY RULES:
1. NO EMOJIS ANYWHERE in the entire JSON output. Zero emojis.
2. All currencies MUST be in INR (Indian Rupee), formatted with ranges like "₹1,500 - ₹2,500" or approximate amounts.
3. Be specific and pinpoint. Name REAL places, real viewpoints, real tunnels, real temples, real waterfalls, real rivers, and real roads.
   - For example in Manali: Atal Tunnel, Solang Valley, Jogini Waterfalls, Hadimba Temple, Rohtang Pass, Naggar Castle.
   - For Germany: Neuschwanstein Castle, Marienplatz, Black Forest B500, Rhine Gorge.
4. ZERO generic filler (do not write "explore local culture" or "stroll the market"). State exact activities and durations.
5. DISTINCT ITINERARY DAYS: Every single day in the itinerary MUST be unique, varied, and distinct. NEVER repeat the same places, activities, or day titles across multiple days. Each day must explore completely different attractions, scenic corridors, cultural sites, and dining venues.
6. FOOD RECOMMENDATIONS: Name 2 to 4 existing, well-known restaurants or cafes with cuisine, whether veg-friendly is true, and approximate cost per person in INR.
7. INDIAN TRAVELLER MODE (Always On):
   - For international trips: Indian passport visa requirements, forex and card tips (Niyo/Forex card, cash ratio), SIM/eSIM, plug/socket type, vegetarian/Jain food availability, safety/scam tips.
   - For domestic trips: Inner Line Permits/Green Cess, altitude and acclimatisation guidance, network coverage (Jio/Airtel postpaid vs prepaid), ATMs, fuel availability, road conditions.
8. BUDGET TABLE: Must include Low, Medium, and High breakdowns across local_travel, stay, food, sightseeing, activities, misc, and total in INR, plus approximate roundtrip flight cost in INR.
9. RESPECT USER CONSTRAINTS: Exactly match the user's requested number of days, food preference (highlight veg/Jain), budget level, and travel pace.
10. DISCLAIMER: Always end with the disclaimer that details are AI-generated estimates and user should verify opening hours, permits, visa rules, and prices.
11. RETURN VALID RAW JSON ONLY complying exactly with the requested schema.
"""


async def process_planner_chat(
    message: str,
    current_state: TripState,
) -> PlannerChatResponse:
    prompt = (
        f"User message: \"{message}\"\n\n"
        f"Current state: {current_state.model_dump_json(exclude_none=True)}\n\n"
        "Extract any new parameters from the user's message, merge with current state, and provide the next step."
    )

    result_json: dict[str, Any] = {}
    provider_used = "groq"

    # Conversational turn: Primary = Groq, Fallback = Gemini
    try:
        result_json = await call_groq_json(
            prompt=prompt,
            system_prompt=PLANNER_EXTRACTOR_SYSTEM_PROMPT,
            max_tokens=1500,
        )
    except Exception as e:
        logger.warning("Groq conversational turn failed: %s; falling back to Gemini.", e)
        try:
            result_json = await call_gemini_json(
                prompt=prompt,
                system_prompt=PLANNER_EXTRACTOR_SYSTEM_PROMPT,
                max_tokens=1500,
            )
            provider_used = "gemini"
        except Exception as e2:
            logger.error("Both AI providers failed for conversational turn: %s", e2)
            # Deterministic local fallback extraction
            return _deterministic_chat_fallback(message, current_state)

    logger.info("Planner chat turn served by provider: %s", provider_used)

    state_data = result_json.get("state", {})
    # Merge existing state with newly extracted non-null keys
    merged_state_dict = current_state.model_dump()
    for k, v in state_data.items():
        if v is not None and v != "":
            merged_state_dict[k] = v

    new_state = TripState.model_validate(merged_state_dict)

    # Compute missing required fields
    missing: list[str] = []
    if not new_state.destination:
        missing.append("destination")
    if not new_state.days:
        missing.append("days")
    if not new_state.origin_city:
        missing.append("origin_city")
    if not new_state.budget_tier:
        missing.append("budget_tier")

    # Progress estimation
    total_fields = 6
    filled_count = sum(
        1
        for val in [
            new_state.destination,
            new_state.days,
            new_state.origin_city,
            new_state.budget_tier,
            new_state.group_type,
            new_state.food_preference,
        ]
        if val is not None
    )
    progress_percent = min(100, int((filled_count / total_fields) * 100))

    is_ready = len(missing) == 0 or result_json.get("is_ready_to_generate", False)

    question = result_json.get("question")
    chips = result_json.get("chips", [])

    if is_ready:
        question = f"Your details for {new_state.destination} are complete. Would you like me to generate your full itinerary and budget now?"
        chips = ["Generate Trip Plan", "Add specific interests", "Adjust budget level"]
        progress_percent = 100

    return PlannerChatResponse(
        state=new_state,
        question=question,
        chips=chips,
        progress_percent=progress_percent,
        is_ready_to_generate=is_ready,
        missing_fields=missing,
    )


def _deterministic_chat_fallback(
    message: str,
    current_state: TripState,
) -> PlannerChatResponse:
    """Zero-dependency local fallback if both providers fail."""
    m = message.lower()
    updated = current_state.model_copy()

    # Extract days
    import re
    day_match = re.search(r"\b(\d{1,2})\s*(?:days?|nights?)\b", m)
    if day_match:
        updated.days = min(14, max(1, int(day_match.group(1))))

    # Extract budget
    if "budget" in m or "cheap" in m:
        updated.budget_tier = "budget"
    elif "luxury" in m or "premium" in m:
        updated.budget_tier = "premium"
    elif "mid" in m:
        updated.budget_tier = "mid-range"

    # Extract food
    if "jain" in m:
        updated.food_preference = "jain"
    elif "veg" in m:
        updated.food_preference = "vegetarian"
    elif "halal" in m:
        updated.food_preference = "halal"
    elif "non-veg" in m:
        updated.food_preference = "non-vegetarian"

    # Extract group
    if "solo" in m:
        updated.group_type = "solo"
    elif "couple" in m:
        updated.group_type = "couple"
    elif "family" in m:
        updated.group_type = "family"
    elif "friends" in m:
        updated.group_type = "friends"

    # Extract from origin city
    from_match = re.search(r"\bfrom\s+([a-zA-Z\s]+?)(?:,|$|\bfor\b|\bwith\b|\bin\b)", message, re.IGNORECASE)
    if from_match:
        updated.origin_city = from_match.group(1).strip()

    # Destination extraction: first comma token or whole string if short
    tokens = [t.strip() for t in message.split(",") if t.strip()]
    if tokens and not updated.destination:
        first_token = tokens[0]
        if not re.search(r"\b\d+\s*days?\b", first_token, re.IGNORECASE) and not first_token.lower().startswith("from "):
            updated.destination = first_token
    elif not updated.destination and len(message.split()) <= 4:
        updated.destination = message.strip()

    missing = []
    if not updated.destination:
        missing.append("destination")
    if not updated.days:
        missing.append("days")
    if not updated.origin_city:
        missing.append("origin_city")
    if not updated.budget_tier:
        missing.append("budget_tier")

    is_ready = len(missing) == 0

    if not updated.destination:
        q = "Where are you planning to travel?"
        chips = ["Manali", "Germany", "Goa", "Leh Ladakh", "Switzerland", "Dubai"]
    elif not updated.days:
        q = f"How many days would you like to spend in {updated.destination}?"
        chips = ["3 Days", "5 Days", "7 Days", "10 Days"]
    elif not updated.origin_city:
        q = "Which city will you be departing from?"
        chips = ["Kolkata", "New Delhi", "Mumbai", "Bengaluru", "Chennai"]
    elif not updated.budget_tier:
        q = "What is your preferred budget level?"
        chips = ["Budget", "Mid-range", "Premium"]
    else:
        q = "Ready to build your complete itinerary?"
        chips = ["Generate Trip Plan"]

    return PlannerChatResponse(
        state=updated,
        question=q,
        chips=chips,
        progress_percent=80 if is_ready else 40,
        is_ready_to_generate=is_ready,
        missing_fields=missing,
    )


async def generate_trip_plan(state: TripState) -> tuple[TripPlan, str]:
    """
    Final plan generation with Provider Fallback:
    Primary: Gemini (rich structured JSON)
    Fallback: Groq (with retry & sectioned synthesis)
    """
    dest = state.destination or "Destination"
    days_count = state.days or 5
    origin = state.origin_city or "New Delhi"
    budget = state.budget_tier or "mid-range"
    group = state.group_type or "couple"
    food = state.food_preference or "vegetarian"
    pace = state.pace or "balanced"
    interests_str = ", ".join(state.interests) if state.interests else "Scenic viewpoints, historical spots, local dining, iconic landmarks"

    prompt = f"""Generate a complete, pinpoint travel plan in RAW JSON.
User Parameters:
- Destination: {dest}
- Duration: {days_count} days
- Origin City: {origin}
- Budget Level: {budget}
- Group Type: {group}
- Food Preference: {food}
- Pace: {pace}
- Interests: {interests_str}

REQUIRED JSON SCHEMA:
{{
  "overview": "string (Concise trip thesis under 80 words)",
  "best_time": "string (Optimal season and months)",
  "arrival": {{
    "recommended": "string (Primary arrival airport / hub)",
    "reason": "string (Short rationale)",
    "alternatives": ["string", "string"],
    "onward_transport": [
      {{"mode": "string", "duration": "string", "cost_inr": "string"}}
    ]
  }},
  "route_summary": "string (Short connectivity and logistics corridor summary)",
  "days": [
    {{
      "day": 1,
      "title": "string (Day highlight)",
      "stops": [
        {{
          "time": "string (e.g. 09:30 AM)",
          "place": "string (Real specific place)",
          "type": "string",
          "what_to_do": "string",
          "duration": "string",
          "cost_inr": "string",
          "tip": "string"
        }}
      ],
      "food": [
        {{
          "name": "string (Real restaurant name)",
          "cuisine": "string",
          "veg_friendly": true,
          "cost_per_person_inr": "string"
        }}
      ],
      "transport": "string"
    }}
  ],
  "budget": {{
    "low": {{"local_travel": "string", "stay": "string", "food": "string", "sightseeing": "string", "activities": "string", "misc": "string", "total": "string"}},
    "medium": {{"local_travel": "string", "stay": "string", "food": "string", "sightseeing": "string", "activities": "string", "misc": "string", "total": "string"}},
    "high": {{"local_travel": "string", "stay": "string", "food": "string", "sightseeing": "string", "activities": "string", "misc": "string", "total": "string"}},
    "approx_flights_inr": "string (Roundtrip flight estimate in INR)"
  }},
  "indian_traveller": {{
    "visa_or_permits": "string",
    "money": "string",
    "connectivity": "string",
    "power": "string",
    "food": "string",
    "safety": "string"
  }},
  "seasonal_advisory": ["string", "string"],
  "flight_search": {{
    "origin_iata": "string (Valid 3-letter IATA code)",
    "destination_iata": "string (Valid 3-letter IATA code)",
    "depart_date": "string (YYYY-MM-DD format approx 30 days from today)",
    "return_date": "string (YYYY-MM-DD format)",
    "passengers": 1
  }},
  "disclaimer": "Details are AI-generated estimates. Please verify opening hours, permits, visa requirements, and prices before booking."
}}
Ensure exactly {days_count} day objects are generated in the "days" array.
"""

    raw_data: dict[str, Any] | None = None
    provider_name = "gemini"

    # 1. Primary Attempt: Gemini
    try:
        raw_data = await call_gemini_json(
            prompt=prompt,
            system_prompt=PLAN_GENERATION_SYSTEM_PROMPT,
            max_tokens=6000,
        )
    except Exception as gemini_err:
        logger.warning("Primary provider Gemini failed for plan generation: %s; falling back to Groq.", gemini_err)
        # 2. Fallback: Groq
        try:
            raw_data = await call_groq_json(
                prompt=prompt,
                system_prompt=PLAN_GENERATION_SYSTEM_PROMPT,
                max_tokens=4000,
            )
            provider_name = "groq"
        except Exception as groq_err:
            logger.error("Both Gemini and Groq full generation failed: %s", groq_err)
            raise ServiceError(
                502,
                "Our trip architecture models are experiencing temporary high latency. Please retry in a few moments.",
                "ai_generation_failed",
            ) from groq_err

    if not raw_data:
        raise ServiceError(500, "Received empty response from trip planner AI engine.", "empty_ai_response")

    # Clean and validate IATA codes against existing catalog
    _sanitize_flight_search(raw_data, origin, dest, days_count)

    # Validate against Pydantic schema
    try:
        plan = TripPlan.model_validate(raw_data)
        logger.info("Trip plan successfully validated for destination: %s via %s", dest, provider_name)
        return plan, provider_name
    except Exception as val_err:
        logger.error("Pydantic validation failed for generated plan: %s", val_err)
        raise ServiceError(
            502,
            "Generated plan failed schema validation. Please click Retry to re-generate.",
            "schema_validation_failed",
        ) from val_err


def _sanitize_flight_search(raw_data: dict[str, Any], origin: str, dest: str, days: int) -> None:
    from datetime import date, timedelta
    today = date.today()
    depart = today + timedelta(days=28)
    return_date = depart + timedelta(days=days)

    flight_search = raw_data.get("flight_search", {})
    if not isinstance(flight_search, dict):
        flight_search = {}

    orig_val = str(flight_search.get("origin_iata", "")).strip().upper()
    dest_val = str(flight_search.get("destination_iata", "")).strip().upper()

    # Match or fallback
    orig_key = origin.lower()
    dest_key = dest.lower()

    if len(orig_val) != 3 or orig_val not in VALID_AIRPORTS.values():
        orig_val = VALID_AIRPORTS.get(orig_key, "DEL")
    if len(dest_val) != 3 or dest_val not in VALID_AIRPORTS.values():
        dest_val = VALID_AIRPORTS.get(dest_key, "IXC")

    flight_search["origin_iata"] = orig_val
    flight_search["destination_iata"] = dest_val
    flight_search["depart_date"] = str(flight_search.get("depart_date") or depart.isoformat())
    flight_search["return_date"] = str(flight_search.get("return_date") or return_date.isoformat())
    flight_search["passengers"] = int(flight_search.get("passengers") or 1)

    raw_data["flight_search"] = flight_search
