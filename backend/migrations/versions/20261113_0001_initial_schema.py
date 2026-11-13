"""Initial SkyFare schema.

Revision ID: 20261113_0001
Revises:
Create Date: 2026-11-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261113_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("company_name", sa.String(160), nullable=True),
        sa.Column("gstin", sa.String(15), nullable=True),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "memberships",
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("tier", sa.String(32), nullable=False),
        sa.Column("miles", sa.Integer(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "airports",
        sa.Column("code", sa.String(3), primary_key=True),
        sa.Column("city", sa.String(80), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("country", sa.String(2), nullable=False),
        sa.Column("category", sa.String(40), nullable=True),
        sa.Column("subtitle", sa.String(160), nullable=True),
        sa.Column("tag", sa.String(80), nullable=True),
        sa.Column("image_path", sa.String(255), nullable=True),
        sa.Column("sample_fare_inr", sa.Numeric(12, 2), nullable=True),
        sa.Column("sample_fare_usd", sa.Numeric(12, 2), nullable=True),
    )

    op.create_table(
        "airlines",
        sa.Column("code", sa.String(3), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
    )

    op.create_table(
        "flights",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("flight_number", sa.String(16), nullable=False),
        sa.Column("airline_code", sa.String(3), sa.ForeignKey("airlines.code"), nullable=False),
        sa.Column("origin_code", sa.String(3), sa.ForeignKey("airports.code"), nullable=False),
        sa.Column("destination_code", sa.String(3), sa.ForeignKey("airports.code"), nullable=False),
        sa.Column("depart_on", sa.Date(), nullable=False),
        sa.Column("depart_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrive_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("stops", sa.Integer(), nullable=False),
        sa.Column("aircraft", sa.String(16), nullable=False),
        sa.UniqueConstraint("flight_number", "depart_at", name="uq_flights_number_departure"),
    )
    op.create_index("ix_flights_flight_number", "flights", ["flight_number"])
    op.create_index("ix_flights_origin_code", "flights", ["origin_code"])
    op.create_index("ix_flights_destination_code", "flights", ["destination_code"])
    op.create_index("ix_flights_depart_on", "flights", ["depart_on"])

    op.create_table(
        "fares",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "flight_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("flights.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cabin", sa.String(32), nullable=False),
        sa.Column("amount_inr", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount_usd", sa.Numeric(12, 2), nullable=False),
        sa.Column("seats_available", sa.Integer(), nullable=False),
        sa.UniqueConstraint("flight_id", "cabin", name="uq_fares_flight_cabin"),
    )
    op.create_index("ix_fares_flight_id", "fares", ["flight_id"])

    op.create_table(
        "bookings",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("reference", sa.String(8), nullable=False),
        sa.Column("user_id", sa.Uuid(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("trip_type", sa.String(32), nullable=False),
        sa.Column("cabin", sa.String(32), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("traveller_count", sa.Integer(), nullable=False),
        sa.Column("corporate_travel", sa.Boolean(), nullable=False),
        sa.Column("payment_status", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_bookings_reference", "bookings", ["reference"], unique=True)
    op.create_index("ix_bookings_user_id", "bookings", ["user_id"])

    op.create_table(
        "booking_segments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("fare_id", sa.Uuid(as_uuid=True), sa.ForeignKey("fares.id"), nullable=False),
        sa.Column("leg_order", sa.Integer(), nullable=False),
        sa.Column("flight_number", sa.String(16), nullable=False),
        sa.Column("airline_name", sa.String(80), nullable=False),
        sa.Column("origin_code", sa.String(3), nullable=False),
        sa.Column("destination_code", sa.String(3), nullable=False),
        sa.Column("depart_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrive_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cabin", sa.String(32), nullable=False),
        sa.Column("unit_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_amount", sa.Numeric(12, 2), nullable=False),
    )
    op.create_index("ix_booking_segments_booking_id", "booking_segments", ["booking_id"])

    op.create_table(
        "passengers",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "booking_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
    )
    op.create_index("ix_passengers_booking_id", "passengers", ["booking_id"])


def downgrade() -> None:
    op.drop_table("passengers")
    op.drop_table("booking_segments")
    op.drop_table("bookings")
    op.drop_table("fares")
    op.drop_table("flights")
    op.drop_table("airlines")
    op.drop_table("airports")
    op.drop_table("memberships")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
