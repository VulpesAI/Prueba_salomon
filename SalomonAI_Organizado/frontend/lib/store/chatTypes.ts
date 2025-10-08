export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  created_at: string;
}

export interface SendPayload {
  conversation_id?: string;
  user_id: string;
  input: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: ChatMessage;
}

export type SseEvent =
  | { type: 'token'; value: string }
  | { type: 'message_end'; message_id: string }
  | { type: 'error'; message: string }
  | { type: 'ping' };

export interface SttResponse {
  transcript: string;
  partial?: string;
}
