"""Store market fare quotes.

Revision ID: 20261113_0002
Revises: 20261113_0001
Create Date: 2026-11-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261113_0002"
down_revision: str | None = "20261113_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "quoted_offers",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("trip_type", sa.String(32), nullable=False),
        sa.Column("cabin", sa.String(32), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("unit_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("traveller_count", sa.Integer(), nullable=False),
        sa.Column("stops", sa.Integer(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("flight_number", sa.String(32), nullable=False),
        sa.Column("airline_code", sa.String(3), nullable=False),
        sa.Column("airline_name", sa.String(80), nullable=False),
        sa.Column("airline_logo", sa.String(255), nullable=True),
        sa.Column("origin_code", sa.String(3), nullable=False),
        sa.Column("destination_code", sa.String(3), nullable=False),
        sa.Column("origin_name", sa.String(160), nullable=False),
        sa.Column("destination_name", sa.String(160), nullable=False),
        sa.Column("depart_on", sa.Date(), nullable=False),
        sa.Column("depart_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrive_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("aircraft", sa.String(80), nullable=False),
        sa.Column("detail", sa.String(255), nullable=True),
        sa.Column("segments", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("quoted_offers")
