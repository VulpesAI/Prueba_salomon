export const runtime = "nodejs";

type FeedbackPayload = {
  user_id: string;
  recommendation_id: string;
  score: -1 | 0 | 1;
  comment?: string;
  client_submission_id?: string;
};

type StoredFeedback = FeedbackPayload & {
  feedback_id: string;
  received_at: string;
};

const feedbackStore: StoredFeedback[] = [];

export async function POST(req: Request) {
  const payload = (await req.json()) as FeedbackPayload;
  const feedback_id = crypto.randomUUID();
  feedbackStore.push({
    ...payload,
    feedback_id,
    received_at: new Date().toISOString(),
  });

  return Response.json({ feedback_id, stored: true });
}

export async function GET() {
  return Response.json({
    count: feedbackStore.length,
  });
}
