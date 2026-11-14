import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.errors import ErrorResponse
from app.core.exceptions import ServiceError
from app.core.logging import configure_logging
from app.core.middleware import RequestIdMiddleware
from app.db.seed import seed_if_empty

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        from app.db.base import Base
        from app.db.session import engine
        import app.models  # ensure models are registered
        Base.metadata.create_all(bind=engine)
        seed_if_empty()
    except Exception as e:
        logger.warning("Database setup or catalog seed skipped: %s", e)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="SkyFare versioned REST API.",
    lifespan=lifespan,
)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app" if settings.app_env in ["production", "staging"] else None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.include_router(v1_router, prefix=settings.api_v1_prefix)


@app.exception_handler(ServiceError)
async def handle_service_error(request: Request, exc: ServiceError) -> JSONResponse:
    error = ErrorResponse(
        code=exc.code,
        message=exc.message,
        request_id=getattr(request.state, "request_id", None),
    )
    headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
    return JSONResponse(
        status_code=exc.status_code,
        content=error.model_dump(mode="json"),
        headers=headers,
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed."
    error = ErrorResponse(
        code="http_error",
        message=message,
        request_id=getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error.model_dump(mode="json"),
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_exception(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    error = ErrorResponse(
        code="validation_error",
        message="Request validation failed.",
        request_id=getattr(request.state, "request_id", None),
        details=[
            {
                "location": list(item["loc"]),
                "message": item["msg"],
                "type": item["type"],
            }
            for item in exc.errors()
        ],
    )
    return JSONResponse(status_code=422, content=error.model_dump(mode="json"))


@app.exception_handler(Exception)
async def handle_unexpected_exception(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.exception("Unhandled request error", extra={"request_id": request_id})
    error = ErrorResponse(
        code="internal_error",
        message="An unexpected error occurred.",
        request_id=request_id,
    )
    return JSONResponse(status_code=500, content=error.model_dump(mode="json"))
