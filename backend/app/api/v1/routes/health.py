import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", summary="Check process liveness")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", summary="Check service readiness")
def readiness_check() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning("Readiness database check failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Database is unavailable.",
            headers={"Retry-After": "5"},
        ) from exc

    return {"status": "ready", "database": "ok"}
