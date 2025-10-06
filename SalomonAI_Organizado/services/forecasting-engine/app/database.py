from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import SQLAlchemyError

from .config import get_settings


def create_db_engine() -> Engine:
    settings = get_settings()
    engine = create_engine(
        _normalize_database_url(settings.database_url),
        pool_pre_ping=True,
        echo=False,
        future=True,
    )
    return engine


@contextmanager
def session_scope(engine: Engine) -> Generator[Engine, None, None]:
    """Provide a transactional scope around a series of operations."""

    connection = engine.connect()
    try:
        yield connection
    finally:
        connection.close()


def _normalize_database_url(raw_url: str) -> str:
    """Ensure the URL is compatible with SQLAlchemy's psycopg driver."""

    url = make_url(raw_url)
    if url.drivername == "postgresql":
        url = url.set(drivername="postgresql+psycopg")
    return str(url)


def verify_financial_history(engine: Engine, *, minimum_days: int) -> dict[str, object]:
    """Validate that the financial_movements table exists and has enough history."""

    existence_query = text("SELECT to_regclass('public.financial_movements')")
    history_query = text(
        """
        SELECT COUNT(*)
        FROM (
            SELECT DATE(transaction_date) AS movement_day
            FROM financial_movements
            GROUP BY DATE(transaction_date)
        ) AS daily_history
        """
    )

    try:
        with session_scope(engine) as connection:
            exists = connection.execute(existence_query).scalar()
            if not exists:
                raise RuntimeError(
                    "La tabla 'financial_movements' no existe o no es accesible en la base de datos configurada."
                )

            history_days = int(connection.execute(history_query).scalar() or 0)
    except SQLAlchemyError as exc:  # pragma: no cover - guard clause for connection issues
        raise RuntimeError("No se pudo consultar la base de datos de movimientos financieros.") from exc

    has_enough_history = history_days >= minimum_days
    return {
        "table": "financial_movements",
        "history_days": history_days,
        "minimum_required_days": minimum_days,
        "has_enough_history": has_enough_history,
    }
