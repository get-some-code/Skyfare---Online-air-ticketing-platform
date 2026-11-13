from fastapi import APIRouter

from app.api.v1.routes import auth, bookings, catalog, health, root

router = APIRouter()
router.include_router(root.router, tags=["service"])
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, tags=["auth"])
router.include_router(catalog.router, tags=["catalog"])
router.include_router(bookings.router, tags=["bookings"])
