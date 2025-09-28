from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from .config import get_settings


def create_db_engine() -> Engine:
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True, echo=False, future=True)
    return engine


@contextmanager
def session_scope(engine: Engine) -> Generator[Engine, None, None]:
    """Provide a transactional scope around a series of operations."""

    connection = engine.connect()
    try:
        yield connection
    finally:
        connection.close()
