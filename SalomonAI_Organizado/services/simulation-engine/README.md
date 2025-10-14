# Simulation Engine

FastAPI microservice responsible for financial simulations such as mortgage amortization and budget what-if analysis. Authentication relies on Supabase JWT tokens validated via JWKS. The service is feature-flagged via `FEATURE_SIMULATIONS` and remains disabled by default.

## Running locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
export FEATURE_SIMULATIONS=true
export SUPABASE_JWKS_URL=http://localhost:9999/mock-jwks  # Replace during development
uvicorn app.main:app --reload --port 8010
```

## Testing

```bash
pytest
```
