from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Airport(Base):
    __tablename__ = "airports"

    code: Mapped[str] = mapped_column(String(3), primary_key=True)
    city: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(160))
    country: Mapped[str] = mapped_column(String(2))
    category: Mapped[str | None] = mapped_column(String(40), default=None)
    subtitle: Mapped[str | None] = mapped_column(String(160), default=None)
    tag: Mapped[str | None] = mapped_column(String(80), default=None)
    image_path: Mapped[str | None] = mapped_column(String(255), default=None)
    sample_fare_inr: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=None)
    sample_fare_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), default=None)
