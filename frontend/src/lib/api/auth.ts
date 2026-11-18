import {
  apiRequest,
  clearStoredSession,
  getStoredRefreshToken,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
} from "./client";
import {
  cancelBookingEnhancedApi,
  createBookingEnhancedApi,
  getLocalBookings,
} from "./bookings";
import type {
  AuthResponse,
  BookingCreate,
  BookingPublic,
  LoginPayload,
  RegisterPayload,
  UserPublic,
} from "./types";

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>("auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setStoredTokens(data.tokens.access_token, data.tokens.refresh_token);
  setStoredUser(data.user);
  return data;
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>("auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setStoredTokens(data.tokens.access_token, data.tokens.refresh_token);
  setStoredUser(data.user);
  return data;
}

export async function logoutApi(): Promise<void> {
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    try {
      await apiRequest<void>("auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearStoredSession();
}

export async function refreshTokenApi(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const data = await apiRequest<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }>("auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  setStoredTokens(data.access_token, data.refresh_token);
  return data;
}

export async function getMeApi(): Promise<UserPublic> {
  return apiRequest<UserPublic>("auth/me");
}

export async function joinMembershipApi(): Promise<{ tier: string; miles: number; enrolled_at: string }> {
  return apiRequest<{ tier: string; miles: number; enrolled_at: string }>("auth/membership", {
    method: "POST",
  });
}

export async function getBookingsApi(): Promise<BookingPublic[]> {
  let backendList: BookingPublic[] = [];
  try {
    const res = await apiRequest<BookingPublic[]>("bookings");
    if (Array.isArray(res)) {
      backendList = res;
    }
  } catch {
    // Backend offline / unreachable (e.g. running on Vercel)
  }

  // Retrieve user's local bookings
  const user = getStoredUser<{ email?: string; id?: string }>();
  const localList = getLocalBookings(user?.email);

  // Merge backend and local bookings deduplicating by reference
  const map = new Map<string, BookingPublic>();
  backendList.forEach((b) => map.set(b.reference, b));
  localList.forEach((b) => {
    // If local booking is confirmed or not present in backend, prefer local
    if (!map.has(b.reference) || b.status === "CONFIRMED" || b.status === "confirmed") {
      map.set(b.reference, b);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function createBookingApi(payload: BookingCreate): Promise<BookingPublic> {
  return createBookingEnhancedApi(payload);
}

export async function cancelBookingApi(reference: string): Promise<BookingPublic> {
  return cancelBookingEnhancedApi(reference);
}
