from typing import Literal
from pydantic import BaseModel, Field


class OnwardTransport(BaseModel):
    mode: str = Field(..., description="Mode of transport e.g. Taxi, Train, Bus, Metro")
    duration: str = Field(..., description="Duration e.g. 2h 30m")
    cost_inr: str = Field(..., description="Estimated cost in INR e.g. ₹1,200 - ₹1,800")


class ArrivalRecommendation(BaseModel):
    recommended: str = Field(..., description="Primary arrival airport or transit hub")
    reason: str = Field(..., description="Direct reason why this is optimal")
    alternatives: list[str] = Field(default_factory=list, description="1-2 sensible alternative airports")
    onward_transport: list[OnwardTransport] = Field(default_factory=list, description="Transport from arrival hub")


class ItineraryStop(BaseModel):
    time: str = Field(..., description="Time of day e.g. 09:00 AM or Morning")
    place: str = Field(..., description="Pinpoint name of viewpoint, temple, lake, pass, etc.")
    type: str = Field(..., description="Sightseeing, Scenic Pass, Temple, Adventure, etc.")
    what_to_do: str = Field(..., description="Specific activity without generic filler")
    duration: str = Field(..., description="Estimated time spent e.g. 2 hours")
    cost_inr: str = Field(..., description="Entry fee or activity cost in INR")
    tip: str = Field(..., description="Practical insider tip")


class FoodRecommendation(BaseModel):
    name: str = Field(..., description="Verified existing restaurant or cafe name")
    cuisine: str = Field(..., description="Type of cuisine e.g. Himachali, Bavarian, Continental")
    veg_friendly: bool = Field(True, description="Whether vegetarian/Jain options exist")
    cost_per_person_inr: str = Field(..., description="Approximate cost per person in INR")


class DayPlan(BaseModel):
    day: int = Field(..., description="Day number (1, 2, ...)")
    title: str = Field(..., description="Day theme / primary destination")
    stops: list[ItineraryStop] = Field(default_factory=list)
    food: list[FoodRecommendation] = Field(default_factory=list)
    transport: str = Field(..., description="Daily local commute guidance")


class BudgetBreakdown(BaseModel):
    local_travel: str = Field(...)
    stay: str = Field(...)
    food: str = Field(...)
    sightseeing: str = Field(...)
    activities: str = Field(...)
    misc: str = Field(...)
    total: str = Field(...)


class TripBudget(BaseModel):
    low: BudgetBreakdown
    medium: BudgetBreakdown
    high: BudgetBreakdown
    approx_flights_inr: str = Field(..., description="Estimated roundtrip flight cost per person")


class IndianTravellerInfo(BaseModel):
    visa_or_permits: str = Field(..., description="Visa rules for Indian passport or domestic ILP/permits")
    money: str = Field(..., description="Forex, cards, UPI, ATM availability")
    connectivity: str = Field(..., description="SIM, eSIM, network coverage notes")
    power: str = Field(..., description="Socket type and voltage details")
    food: str = Field(..., description="Indian food, vegetarian and Jain availability")
    safety: str = Field(..., description="Safety, altitude, road conditions, and scam notes")


class FlightSearchPrefill(BaseModel):
    origin_iata: str = Field("DEL")
    destination_iata: str = Field("IXC")
    depart_date: str = Field(...)
    return_date: str = Field(...)
    passengers: int = Field(1)


class TripPlan(BaseModel):
    overview: str = Field(..., description="Executive trip summary")
    best_time: str = Field(..., description="Best season or months to visit")
    arrival: ArrivalRecommendation
    route_summary: str = Field(..., description="Overview of the routing and stops")
    days: list[DayPlan]
    budget: TripBudget
    indian_traveller: IndianTravellerInfo
    seasonal_advisory: list[str] = Field(default_factory=list)
    flight_search: FlightSearchPrefill
    disclaimer: str = Field(
        "Details are AI-generated estimates. Please verify opening hours, permits, visa requirements, and prices before booking."
    )


class TripState(BaseModel):
    destination: str | None = None
    trip_type: Literal["domestic", "international"] | None = None
    origin_city: str | None = None
    days: int | None = None
    dates_or_month: str | None = None
    budget_tier: Literal["budget", "mid-range", "premium"] | None = None
    total_budget_inr: str | None = None
    group_type: Literal["solo", "couple", "family", "friends"] | None = None
    group_size: int | None = None
    interests: list[str] = Field(default_factory=list)
    food_preference: Literal["vegetarian", "non-vegetarian", "jain", "halal"] | None = None
    pace: Literal["relaxed", "balanced", "packed"] | None = None


class PlannerChatRequest(BaseModel):
    message: str = Field(..., max_length=1000)
    state: TripState = Field(default_factory=TripState)


class PlannerChatResponse(BaseModel):
    state: TripState
    question: str | None = None
    chips: list[str] = Field(default_factory=list)
    progress_percent: int = Field(0, ge=0, le=100)
    is_ready_to_generate: bool = False
    missing_fields: list[str] = Field(default_factory=list)


class PlannerGenerateRequest(BaseModel):
    state: TripState


class PlannerGenerateResponse(BaseModel):
    plan: TripPlan
    provider: str
