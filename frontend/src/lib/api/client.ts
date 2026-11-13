export interface ApiErrorPayload {
  code?: string;
  message?: string;
  request_id?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    status: number,
    payload: ApiErrorPayload,
    fallbackMessage: string,
  ) {
    super(payload.message ?? fallbackMessage);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code ?? "http_error";
    this.requestId = payload.request_id;
    this.details = payload.details;
  }
}

const ACCESS_TOKEN_KEY = "skyfare_access_token";
const REFRESH_TOKEN_KEY = "skyfare_refresh_token";
const USER_PROFILE_KEY = "skyfare_user_profile";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown | null): void {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_PROFILE_KEY);
  }
}

export function setStoredTokens(accessToken: string | null, refreshToken: string | null): void {
  if (typeof window === "undefined") return;
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const refreshUrl = new URL("auth/refresh", getApiBaseUrl());
    const res = await fetch(refreshUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearStoredSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("skyfare:auth:session_expired"));
      }
      return null;
    }

    const data = (await res.json()) as { access_token: string; refresh_token: string };
    setStoredTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
  isRetry = false,
): Promise<TResponse> {
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(cleanPath, getApiBaseUrl());
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Auto-inject stored access token if not explicitly provided
  if (!headers.has("Authorization")) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...init,
    cache: init.cache ?? "no-store",
    headers,
  });

  // Handle silent token refresh on 401
  if (
    response.status === 401 &&
    !isRetry &&
    !cleanPath.startsWith("auth/login") &&
    !cleanPath.startsWith("auth/register") &&
    !cleanPath.startsWith("auth/refresh")
  ) {
    if (!refreshPromise) {
      refreshPromise = attemptTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
      return apiRequest<TResponse>(path, { ...init, headers: retryHeaders }, true);
    }
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const responseText = await response.text();
  let payload: unknown;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch (error) {
      throw new Error(
        `SkyFare API returned an invalid JSON response (${response.status}).`,
        { cause: error },
      );
    }
  }

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null
        ? (payload as ApiErrorPayload)
        : {};
    throw new ApiError(
      response.status,
      errorPayload,
      response.statusText || "SkyFare API request failed.",
    );
  }

  return payload as TResponse;
}
