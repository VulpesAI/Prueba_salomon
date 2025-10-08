export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.pathname.split("/").pop() ?? "";
  return Response.json({
    user_id: userId,
    items: [],
    meta: { count: 0 },
  });
}
