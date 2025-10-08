export async function GET(
  _request: Request,
  context: { params: { user_id: string } },
) {
  return Response.json({
    user_id: context.params.user_id,
    items: [],
    meta: { count: 0 },
  });
}
