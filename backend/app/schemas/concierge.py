from typing import Literal
from pydantic import BaseModel, Field


class ChatOption(BaseModel):
    label: str
    value: str
    action: str = "reply"
    url: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=4000)
    options: list[ChatOption] | None = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=50)


class ChatResponse(BaseModel):
    reply: str
    provider: str
    status: str = "ok"
    options: list[ChatOption] = []
