"""Booking enhancements: seat reservations, addons, payments, cancellations, and pricing snapshots.

Revision ID: 20261118_0003
Revises: 20261113_0002
Create Date: 2026-11-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261118_0003"
down_revision: str | None = "20261113_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Enhance bookings table
    op.add_column("bookings", sa.Column("contact_email", sa.String(255), nullable=True))
    op.add_column("bookings", sa.Column("contact_phone", sa.String(32), nullable=True))
    op.add_column("bookings", sa.Column("held_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("base_amount", sa.Numeric(12, 2), nullable=True, server_default="0.00"))
    op.add_column("bookings", sa.Column("taxes_amount", sa.Numeric(12, 2), nullable=True, server_default="0.00"))
    op.add_column("bookings", sa.Column("seats_amount", sa.Numeric(12, 2), nullable=True, server_default="0.00"))
    op.add_column("bookings", sa.Column("addons_amount", sa.Numeric(12, 2), nullable=True, server_default="0.00"))
    op.add_column("bookings", sa.Column("convenience_fee", sa.Numeric(12, 2), nullable=True, server_default="0.00"))
    op.add_column("bookings", sa.Column("fare_tier", sa.String(32), nullable=True, server_default="standard"))
    op.add_column("bookings", sa.Column("pricing_snapshot", sa.JSON(), nullable=True))

    # 2. Enhance passengers table
    op.add_column("passengers", sa.Column("title", sa.String(10), nullable=True))
    op.add_column("passengers", sa.Column("first_name", sa.String(60), nullable=True))
    op.add_column("passengers", sa.Column("last_name", sa.String(60), nullable=True))
    op.add_column("passengers", sa.Column("passenger_type", sa.String(20), nullable=True, server_default="adult"))
    op.add_column("passengers", sa.Column("gender", sa.String(20), nullable=True))
    op.add_column("passengers", sa.Column("nationality", sa.String(60), nullable=True, server_default="Indian"))
    op.add_column("passengers", sa.Column("passport_number", sa.String(40), nullable=True))
    op.add_column("passengers", sa.Column("passport_expiry", sa.Date(), nullable=True))
    op.add_column("passengers", sa.Column("seat_number", sa.String(8), nullable=True))
    op.add_column("passengers", sa.Column("ticket_number", sa.String(32), nullable=True))

    # 3. Create seat_reservations table
    op.create_table(
        "seat_reservations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("flight_id", sa.Uuid(as_uuid=True), sa.ForeignKey("flights.id"), nullable=False, index=True),
        sa.Column(
            "booking_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "passenger_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("passengers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("seat_number", sa.String(8), nullable=False, index=True),
        sa.Column("seat_class", sa.String(32), nullable=False, server_default="standard"),
        sa.Column("price_inr", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("price_usd", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("status", sa.String(20), nullable=False, server_default="held", index=True),
        sa.Column("held_until", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 4. Create booking_addons table
    op.create_table(
        "booking_addons",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "passenger_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("passengers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("code", sa.String(32), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("price_inr", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("price_usd", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
    )

    # 5. Create payment_transactions table
    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("transaction_ref", sa.String(40), nullable=False, unique=True, index=True),
        sa.Column("payment_method", sa.String(32), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, index=True),
        sa.Column("provider", sa.String(32), nullable=False, server_default="simulated"),
        sa.Column("idempotency_key", sa.String(64), nullable=True, unique=True, index=True),
        sa.Column("card_brand", sa.String(32), nullable=True),
        sa.Column("card_last4", sa.String(4), nullable=True),
        sa.Column("upi_vpa", sa.String(80), nullable=True),
        sa.Column("bank_name", sa.String(80), nullable=True),
        sa.Column("error_message", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # 6. Create cancellations table
    op.create_table(
        "cancellations",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column("reason", sa.String(255), nullable=False),
        sa.Column("cancellation_fee", sa.Numeric(12, 2), nullable=False),
        sa.Column("refund_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("refund_status", sa.String(32), nullable=False, server_default="completed"),
        sa.Column("refund_reference", sa.String(40), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("cancellations")
    op.drop_table("payment_transactions")
    op.drop_table("booking_addons")
    op.drop_table("seat_reservations")

    for col in [
        "title", "first_name", "last_name", "passenger_type", "gender",
        "nationality", "passport_number", "passport_expiry", "seat_number", "ticket_number"
    ]:
        op.drop_column("passengers", col)

    for col in [
        "contact_email", "contact_phone", "held_until", "base_amount", "taxes_amount",
        "seats_amount", "addons_amount", "convenience_fee", "fare_tier", "pricing_snapshot"
    ]:
        op.drop_column("bookings", col)
