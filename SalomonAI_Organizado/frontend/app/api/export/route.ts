export async function POST() {
  return Response.json(
    { status: 'accepted', job_id: 'exp_demo_1' },
    { status: 202 },
  );
}
