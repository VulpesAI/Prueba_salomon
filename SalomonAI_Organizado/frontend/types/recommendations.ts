export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface EvidenceItem {
  label: string;
  value: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  score: number;
  evidence?: EvidenceItem[];
  created_at: string;
  updated_at: string;
}

export interface RecommendationsResponse {
  items: Recommendation[];
}

export interface FeedbackPayload {
  user_id: string;
  recommendation_id: string;
  score: 1 | -1;
  client_submission_id: string;
}

export interface FeedbackResponse {
  status: "ok";
  updated?: { recommendation_id: string; score?: number };
}
