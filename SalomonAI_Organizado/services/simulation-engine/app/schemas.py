from __future__ import annotations

from datetime import date
from typing import List, Literal

from pydantic import BaseModel, Field, PositiveFloat, field_validator


class MortgageSimulationRequest(BaseModel):
    loan_amount: PositiveFloat = Field(..., description="Monto del crédito en pesos chilenos")
    annual_interest_rate: PositiveFloat = Field(..., description="Tasa nominal anual expresada en porcentaje")
    years: int = Field(..., ge=1, le=40, description="Plazo en años")
    payments_per_year: int = Field(12, ge=1, le=52, description="Número de dividendos por año")
    monthly_insurance: float = Field(0.0, ge=0.0, description="Costo mensual de seguros obligatorios")
    monthly_maintenance: float = Field(0.0, ge=0.0, description="Costos mensuales adicionales")

    @field_validator("annual_interest_rate")
    @classmethod
    def _normalize_rate(cls, value: float) -> float:
        return value / 100.0 if value > 1 else value


class AmortizationEntry(BaseModel):
    period: int
    payment_date: date
    principal_paid: float
    interest_paid: float
    insurance_paid: float
    remaining_balance: float


class MortgageSimulationResponse(BaseModel):
    dividendo: float
    cae: float
    tabla_resumida: List[AmortizationEntry]


class BudgetCategory(BaseModel):
    name: str
    amount: float = Field(..., ge=0.0)
    type: Literal["fixed", "variable"] = "variable"


class BudgetWhatIfRequest(BaseModel):
    monthly_income: PositiveFloat
    initial_savings: float = Field(0.0)
    categories: List[BudgetCategory]
    savings_target_rate: float = Field(0.1, ge=0.0, le=1.0)
    inflation_rate: float = Field(0.04, ge=0.0, le=0.5)

    @field_validator("inflation_rate")
    @classmethod
    def _normalize_inflation(cls, value: float) -> float:
        return value / 100.0 if value > 1 else value

    @field_validator("savings_target_rate")
    @classmethod
    def _normalize_savings(cls, value: float) -> float:
        return value / 100.0 if value > 1 else value


class MonthlyProjection(BaseModel):
    month: int
    projected_savings: float
    projected_expenses: float
    disposable_income: float


class BudgetWhatIfResponse(BaseModel):
    proyeccion_12m: List[MonthlyProjection]
    alerts: List[str]
