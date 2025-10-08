const resumen = {
  income_total: 0,
  expense_total: 0,
  net_cashflow: 0,
  top_categories: [],
};

export async function GET() {
  return Response.json(resumen);
}
