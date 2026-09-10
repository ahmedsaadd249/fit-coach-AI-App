export type ChatRole = "user" | "coach";

export type MessageStatus = "sending" | "sent" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  status?: MessageStatus;
}

export interface ThreadState {
  sessionId: string;
  messages: ChatMessage[];
}

export interface ProgressRecord {
  lifetimeMessageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentFloor: number;
  nextThreshold: number | null;
  progressPct: number;
  messagesToNext: number | null;
}

export type ApiErrorKind =
  | "validation_error"
  | "rate_limit_exceeded"
  | "upstream_timeout"
  | "upstream_error"
  | "auth_error"
  | "client_timeout"
  | "network_error"
  | "unknown_error";

export interface CoachSuccessResponse {
  reply: string;
}

export interface CoachErrorResponse {
  error: ApiErrorKind;
  message: string;
  details?: Record<string, string>;
}

export type CoachResponse = CoachSuccessResponse | CoachErrorResponse;
