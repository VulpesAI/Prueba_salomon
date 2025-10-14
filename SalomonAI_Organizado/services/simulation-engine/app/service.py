from __future__ import annotations

from datetime import date
from typing import List

from .schemas import (
    AmortizationEntry,
    BudgetCategory,
    BudgetWhatIfRequest,
    BudgetWhatIfResponse,
    MonthlyProjection,
    MortgageSimulationRequest,
    MortgageSimulationResponse,
)


def _monthly_payment(principal: float, rate: float, payments_per_year: int, total_years: int) -> float:
    periodic_rate = rate / payments_per_year
    total_payments = payments_per_year * total_years
    if periodic_rate == 0:
        return principal / total_payments
    factor = (1 + periodic_rate) ** total_payments
    payment = principal * periodic_rate * factor / (factor - 1)
    return payment


def simulate_mortgage(payload: MortgageSimulationRequest) -> MortgageSimulationResponse:
    principal = float(payload.loan_amount)
    annual_rate = float(payload.annual_interest_rate)
    periodic_payment = _monthly_payment(
        principal, annual_rate, payload.payments_per_year, payload.years
    )
    total_payment = periodic_payment + payload.monthly_insurance + payload.monthly_maintenance

    entries: List[AmortizationEntry] = []
    balance = principal
    periodic_rate = annual_rate / payload.payments_per_year

    for period in range(1, min(payload.years * payload.payments_per_year, 12) + 1):
        interest = balance * periodic_rate
        principal_component = periodic_payment - interest
        if period == payload.years * payload.payments_per_year:
            principal_component = balance
        balance = max(balance - principal_component, 0.0)
        payment_date = date.today().replace(day=1)
        month = ((payment_date.month - 1) + period) % 12 + 1
        year = payment_date.year + ((payment_date.month - 1) + period) // 12
        entry_date = payment_date.replace(year=year, month=month)
        entries.append(
            AmortizationEntry(
                period=period,
                payment_date=entry_date,
                principal_paid=round(principal_component, 2),
                interest_paid=round(interest, 2),
                insurance_paid=round(payload.monthly_insurance + payload.monthly_maintenance, 2),
                remaining_balance=round(balance, 2),
            )
        )

    cae = (1 + annual_rate / payload.payments_per_year) ** payload.payments_per_year - 1

    return MortgageSimulationResponse(
        dividendo=round(total_payment, 2),
        cae=round(cae * 100, 2),
        tabla_resumida=entries,
    )


def _categorise_expenses(categories: List[BudgetCategory]) -> tuple[float, float]:
    fixed = sum(item.amount for item in categories if item.type == "fixed")
    variable = sum(item.amount for item in categories if item.type != "fixed")
    return fixed, variable


def simulate_budget(payload: BudgetWhatIfRequest) -> BudgetWhatIfResponse:
    fixed, variable = _categorise_expenses(payload.categories)
    monthly_expenses = fixed + variable
    savings_target = payload.monthly_income * payload.savings_target_rate

    projections: List[MonthlyProjection] = []
    savings_balance = payload.initial_savings
    monthly_inflation = (1 + payload.inflation_rate) ** (1 / 12) - 1
    alerts: List[str] = []

    for month in range(1, 13):
        inflation_multiplier = (1 + monthly_inflation) ** month
        adjusted_expenses = monthly_expenses * inflation_multiplier
        disposable = payload.monthly_income - adjusted_expenses
        savings_balance += max(disposable, 0)
        projections.append(
            MonthlyProjection(
                month=month,
                projected_savings=round(savings_balance, 2),
                projected_expenses=round(adjusted_expenses, 2),
                disposable_income=round(disposable, 2),
            )
        )

    average_disposable = sum(item.disposable_income for item in projections) / len(projections)
    if average_disposable < savings_target:
        alerts.append(
            "El ahorro proyectado está por debajo de la meta. Considera reducir gastos variables o aumentar ingresos."
        )
    if fixed / max(payload.monthly_income, 1) > 0.5:
        alerts.append("Los gastos fijos superan el 50% de los ingresos. Revisa compromisos de largo plazo.")
    if projections[-1].projected_savings < payload.monthly_income * 3:
        alerts.append("El fondo de emergencia proyectado es insuficiente (< 3 meses de ingresos).")

    return BudgetWhatIfResponse(proyeccion_12m=projections, alerts=alerts)
