# Environment must be set before the application imports its settings.
# ruff: noqa: E402
import os

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-skyfare-auth-suite-0123456789"
os.environ["JWT_ACCESS_TOKEN_MINUTES"] = "15"
os.environ["JWT_REFRESH_TOKEN_DAYS"] = "30"

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings

get_settings.cache_clear()

from app.db.base import Base
from app.db.seed import seed_catalog
from app.db.session import SessionLocal, engine
from app.main import app


@pytest.fixture(autouse=True)
def reset_database():
    import app.models  # noqa: F401

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_catalog(session)
        session.commit()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
