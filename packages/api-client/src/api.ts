import { BASE_URL, apiClient, getAccessToken } from "./axios";
import type {
  AuthResponse,
  User,
  DateEvent,
  DateInvite,
  Message,
  Relationship,
  CreateEventPayload,
  UpdateEventPayload,
  CreateInvitePayload,
  RespondInvitePayload,
  PaginatedMessages,
  AIChatPayload,
} from "@ronbri/types";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<AuthResponse>("/auth/login", { username, password }).then((r) => r.data),

  refresh: () =>
    apiClient.post<{ accessToken: string }>("/auth/refresh").then((r) => r.data),

  logout: () =>
    apiClient.post("/auth/logout").then((r) => r.data),

  me: () =>
    apiClient.get<User>("/auth/me").then((r) => r.data),

  updateAvatar: (avatar: string) =>
    apiClient.patch<User>("/auth/me/avatar", { avatar }).then((r) => r.data),
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const calendarApi = {
  list: () =>
    apiClient.get<DateEvent[]>("/calendar").then((r) => r.data),

  create: (payload: CreateEventPayload) =>
    apiClient.post<DateEvent>("/calendar", payload).then((r) => r.data),

  update: (id: string, payload: UpdateEventPayload) =>
    apiClient.patch<DateEvent>(`/calendar/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/calendar/${id}`).then((r) => r.data),
};

// ─── Invites ──────────────────────────────────────────────────────────────────

export const invitesApi = {
  create: (payload: CreateInvitePayload) =>
    apiClient.post<DateInvite>("/invites", payload).then((r) => r.data),

  inbox: () =>
    apiClient.get<DateInvite[]>("/invites/inbox").then((r) => r.data),

  sent: () =>
    apiClient.get<DateInvite[]>("/invites/sent").then((r) => r.data),

  respond: (id: string, payload: RespondInvitePayload) =>
    apiClient.patch<DateInvite>(`/invites/${id}/respond`, payload).then((r) => r.data),

  seen: (id: string) =>
    apiClient.patch<DateInvite>(`/invites/${id}/seen`).then((r) => r.data),
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  list: (cursor?: string, limit = 50) =>
    apiClient
      .get<PaginatedMessages>("/messages", { params: { cursor, limit } })
      .then((r) => r.data),
};

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadApi = {
  image: (file: File | Blob) => {
    const form = new FormData();
    form.append("image", file);
    return apiClient
      .post<{ url: string; publicId: string }>("/upload/image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  delete: (publicId: string) =>
    apiClient.delete(`/upload/${encodeURIComponent(publicId)}`).then((r) => r.data),
};

// ─── Relationship ─────────────────────────────────────────────────────────────

export const relationshipApi = {
  get: () =>
    apiClient.get<Relationship>("/relationship").then((r) => r.data),

  update: (startDate: string) =>
    apiClient.patch<Relationship>("/relationship", { startDate }).then((r) => r.data),
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  // Returns the raw fetch Response so the caller can stream it
  chat: (payload: AIChatPayload): Promise<Response> => {
    return fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAccessToken() ?? ""}`,
      },
      body: JSON.stringify(payload),
    });
  },
};

// ─── Giphy (proxied through server) ───────────────────────────────────────────

export const giphyApi = {
  search: (query: string, limit = 20) =>
    apiClient
      .get<{ data: Array<{ id: string; images: { fixed_height: { url: string } } }> }>(
        "/giphy/search",
        { params: { q: query, limit } }
      )
      .then((r) => r.data),

  trending: (limit = 20) =>
    apiClient
      .get<{ data: Array<{ id: string; images: { fixed_height: { url: string } } }> }>(
        "/giphy/trending",
        { params: { limit } }
      )
      .then((r) => r.data),
};
