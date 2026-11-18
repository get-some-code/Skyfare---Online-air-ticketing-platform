import uuid

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ticketing import (
    AddonOption,
    BookingCreate,
    BookingPublic,
    CancellationRequest,
    PaymentRequest,
    PaymentResponse,
    PriceBreakdownResponse,
    PriceCalculationRequest,
    SeatMapResponse,
)
from app.services import bookings as booking_service

router = APIRouter(prefix="/bookings")


@router.get("/seats/{flight_id}", response_model=SeatMapResponse)
def get_seat_map(
    flight_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> SeatMapResponse:
    return booking_service.get_seat_map(db, flight_id)


@router.get("/addons", response_model=list[AddonOption])
def get_addons() -> list[AddonOption]:
    return booking_service.get_available_addons()


@router.post("/pricing", response_model=PriceBreakdownResponse)
def calculate_pricing(
    payload: PriceCalculationRequest,
    db: Session = Depends(get_db),
) -> PriceBreakdownResponse:
    return booking_service.calculate_price_breakdown(db, payload)


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


@router.post("/{reference}/pay", response_model=PaymentResponse)
def pay_booking(
    reference: str,
    payload: PaymentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentResponse:
    return booking_service.process_payment(db, user, reference, payload)


@router.post("/{reference}/cancel", response_model=BookingPublic)
def cancel_booking(
    reference: str,
    payload: CancellationRequest | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BookingPublic:
    return booking_service.cancel_booking(db, user, reference, payload)


@router.get("/{reference}/ticket.pdf")
def download_ticket_pdf(
    reference: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    pdf_bytes = booking_service.get_ticket_pdf(db, user, reference)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="SkyFare_Ticket_{reference.upper()}.pdf"'
        },
    )

