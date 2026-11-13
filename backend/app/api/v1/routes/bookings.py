from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ticketing import BookingCreate, BookingPublic
from app.services import bookings as booking_service

router = APIRouter(prefix="/bookings")


@router.post("", response_model=BookingPublic, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingPublic:
    return booking_service.create_booking(db, user, payload)


@router.get("", response_model=list[BookingPublic])
def list_bookings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[BookingPublic]:
    return booking_service.list_bookings(db, user)


@router.get("/{reference}", response_model=BookingPublic)
def get_booking(
    reference: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingPublic:
    return booking_service.get_booking(db, user, reference)


@router.post("/{reference}/cancel", response_model=BookingPublic)
def cancel_booking(
    reference: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingPublic:
    return booking_service.cancel_booking(db, user, reference)
