import logging

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.planner import (
    PlannerChatRequest,
    PlannerChatResponse,
    PlannerGenerateRequest,
    PlannerGenerateResponse,
)
from app.services.planner import (
    check_rate_limit,
    generate_trip_plan,
    process_planner_chat,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/chat", response_model=PlannerChatResponse)
async def planner_chat(
    payload: PlannerChatRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Clarifying turn for guided trip planning.
    Requires authentication. Rate-limited to 60 calls/hour per user.
    """
    check_rate_limit(str(current_user.id), action="chat")
    response = await process_planner_chat(payload.message, payload.state)
    return response


@router.post("/generate", response_model=PlannerGenerateResponse)
async def planner_generate(
    payload: PlannerGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate final detailed itinerary and budget in INR.
    Requires authentication. Rate-limited to 10 generations/hour per user.
    """
    check_rate_limit(str(current_user.id), action="generate")
    plan, provider = await generate_trip_plan(payload.state)
    return PlannerGenerateResponse(plan=plan, provider=provider)
