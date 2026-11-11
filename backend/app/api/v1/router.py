from fastapi import APIRouter

from app.api.v1.routes import health, root

router = APIRouter()
router.include_router(root.router, tags=["service"])
router.include_router(health.router, tags=["health"])
