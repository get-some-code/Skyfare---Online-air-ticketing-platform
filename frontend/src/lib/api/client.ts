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

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
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

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export async function apiRequest<TResponse>(
  path: string,
  init: RequestInit = {},
): Promise<TResponse> {
  const url = new URL(path.replace(/^\/+/, ""), getApiBaseUrl());
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
