type QueryParams = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  params?: QueryParams;
  headers?: Record<string, string>;
  _retry?: boolean;
};

type ApiResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
};

const resolveBaseUrl = (): string => {
  const raw =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL
      : (import.meta as any)?.env?.VITE_API_URL ?? "http://localhost:3001")
      .trim();

  let normalized = raw;

  if (!/^https?:\/\//i.test(normalized)) {
    const host = normalized.replace(/^\/+/, "");
    normalized = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(host)
      ? `http://${host}`
      : `https://${host}`;
  }

  return normalized.replace(/\/+$/, "").replace(/\/api$/i, "");
};

export const BASE_URL = resolveBaseUrl();

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const isFormData = (v: unknown): v is FormData =>
  typeof FormData !== "undefined" && v instanceof FormData;

const buildUrl = (path: string, params?: QueryParams): string => {
  const url = new URL(`${BASE_URL}/api${path.startsWith("/") ? path : `/${path}`}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
};

const createHttpError = (status: number, data: unknown, url: string, retry = false) => ({
  response: { status, data },
  config: { url, _retry: retry },
  message: `Request failed with status code ${status}`,
});

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  if (!response.ok) {
    const data = await parseResponse<unknown>(response).catch(() => null);
    throw createHttpError(response.status, data, "/auth/refresh", true);
  }

  const data = await parseResponse<{ accessToken: string }>(response);
  setAccessToken(data.accessToken);
  return data.accessToken;
};

const request = async <T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const url = buildUrl(path, options.params);
  const headers: Record<string, string> = { ...(options.headers ?? {}) };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const isBodyForm = isFormData(body);
  if (body !== undefined && !isBodyForm && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    credentials: "include",
    headers,
    body:
      body === undefined
        ? undefined
        : isBodyForm
          ? body
          : headers["Content-Type"]?.includes("application/json")
            ? JSON.stringify(body)
            : (body as never),
  });

  const requestUrl = path;
  const isAuthEndpoint = requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh");

  if (response.status === 401 && !options._retry && !isAuthEndpoint) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return request<T>(method, path, body, { ...options, _retry: true });
    } catch (refreshError) {
      setAccessToken(null);
      const eventTarget = globalThis as typeof globalThis & {
        dispatchEvent?: (event: Event) => boolean;
      };
      if (typeof eventTarget.dispatchEvent === "function") {
        eventTarget.dispatchEvent(new Event("auth:logout"));
      }
      throw refreshError;
    }
  }

  if (!response.ok) {
    const data = await parseResponse<unknown>(response).catch(() => null);
    throw createHttpError(response.status, data, requestUrl, Boolean(options._retry));
  }

  const data = await parseResponse<T>(response);
  return { data, status: response.status, headers: response.headers };
};

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, options),
};
