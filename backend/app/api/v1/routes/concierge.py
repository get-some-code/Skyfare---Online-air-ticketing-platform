from fastapi import APIRouter

from app.schemas.concierge import ChatRequest, ChatResponse
from app.services.concierge import chat_with_concierge

router = APIRouter(prefix="/concierge", tags=["concierge"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    reply, provider = await chat_with_concierge(payload.messages)
    return ChatResponse(reply=reply, provider=provider, status="ok")
