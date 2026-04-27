// ─── Enums ────────────────────────────────────────────────────────────────────

export enum Role {
  BOY = "BOY",
  GIRL = "GIRL",
}

export enum InviteType {
  OUTSIDE = "OUTSIDE",
  FOOD = "FOOD",
  BONDING = "BONDING",
  CUSTOM = "CUSTOM",
}

export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  RESCHEDULED = "RESCHEDULED",
}

// ─── Models ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  theme: string;
  avatar: string | null;
  createdAt: string;
}

export interface DateEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  emoji: string | null;
  imageUrl: string | null;
  createdById: string;
  createdBy: User;
  createdAt: string;
}

export interface DateInvite {
  id: string;
  type: InviteType;
  title: string;
  message: string;
  emojis: string[];
  gifUrl: string | null;
  imageUrl: string | null;
  senderId: string;
  sender: User;
  receiverId: string;
  receiver: User;
  status: InviteStatus;
  scheduledDate: string | null;
  rescheduleDate: string | null;
  seenAt: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  content: string | null;
  imageUrl: string | null;
  gifUrl: string | null;
  senderId: string;
  sender: User;
  createdAt: string;
  readAt: string | null;
}

export interface Relationship {
  id: string;
  startDate: string;
  updatedAt: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginatedMessages {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// ─── Socket Event Payloads ────────────────────────────────────────────────────

export interface SocketMessageNew {
  message: Message;
}

export interface SocketMessageTyping {
  userId: string;
  isTyping: boolean;
}

export interface SocketMessageRead {
  messageId: string;
  readAt: string;
}

export interface SocketInviteNew {
  invite: DateInvite;
}

export interface SocketInviteResponded {
  inviteId: string;
  status: InviteStatus;
}

// ─── Invite Payloads ─────────────────────────────────────────────────────────

export interface CreateInvitePayload {
  type: InviteType;
  title: string;
  message: string;
  emojis: string[];
  gifUrl?: string;
  imageUrl?: string;
  scheduledDate?: string;
}

export interface RespondInvitePayload {
  status: InviteStatus.ACCEPTED | InviteStatus.DECLINED | InviteStatus.RESCHEDULED;
  rescheduleDate?: string;
}

// ─── Calendar Payloads ────────────────────────────────────────────────────────

export interface CreateEventPayload {
  title: string;
  description?: string;
  date: string;
  emoji?: string;
  imageUrl?: string;
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {}

// ─── AI Types ─────────────────────────────────────────────────────────────────

export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIChatPayload {
  messages: AIChatMessage[];
}
