export async function GET() {
  const body = {
    items: [
      { id: 'acc_1', provider: 'Banco de Chile (Belvo)', status: 'pending' as const },
      { id: 'acc_2', provider: 'Santander (Fintoc)', status: 'connected' as const },
    ],
  };

  return Response.json(body, { status: 200 });
}
