export type SuggestedGoal = {
  id: string
  title: string
  description: string
  potentialMonthlyContribution: number
}

export const suggestedGoals: SuggestedGoal[] = [
  {
    id: "universidad-hija",
    title: "Ahorro universidad Camila",
    description:
      "Proyecta matrícula y manutención considerando inflación educativa local.",
    potentialMonthlyContribution: 280000,
  },
  {
    id: "anticipo-auto",
    title: "Anticipo para auto eléctrico",
    description:
      "Reduce gastos en combustible y mantención con un vehículo más eficiente.",
    potentialMonthlyContribution: 210000,
  },
  {
    id: "retiro-flexible",
    title: "Fondo de retiro flexible 2045",
    description:
      "Diversifica aportes en instrumentos de riesgo moderado para alcanzar tu meta.",
    potentialMonthlyContribution: 350000,
  },
]
