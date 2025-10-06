from __future__ import annotations

import logging
from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """Return a Supabase client configured from settings."""

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("Supabase credentials are not configured for the forecasting engine")

    logger.debug("Creating Supabase client for forecasting engine")
    return create_client(settings.supabase_url, settings.supabase_key)
