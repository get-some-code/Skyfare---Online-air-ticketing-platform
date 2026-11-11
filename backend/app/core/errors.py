from typing import Any

from pydantic import BaseModel, ConfigDict


class ErrorResponse(BaseModel):
    code: str
    message: str
    request_id: str | None = None
    details: Any | None = None

    model_config = ConfigDict(extra="forbid")
