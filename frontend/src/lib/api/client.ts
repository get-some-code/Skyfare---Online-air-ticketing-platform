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

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not configured. Copy frontend/.env.example to frontend/.env.local.",
    );
  }

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
