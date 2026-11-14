import { apiRequest } from "@/lib/api/client";
import { localGeneratePlanFallback, localPlannerChatFallback } from "./planner-fallback";

export interface OnwardTransport {
  mode: string;
  duration: string;
  cost_inr: string;
}

export interface ArrivalRecommendation {
  recommended: string;
  reason: string;
  alternatives: string[];
  onward_transport: OnwardTransport[];
}

export interface ItineraryStop {
  time: string;
  place: string;
  type: string;
  what_to_do: string;
  duration: string;
  cost_inr: string;
  tip: string;
}

export interface FoodRecommendation {
  name: string;
  cuisine: string;
  veg_friendly: boolean;
  cost_per_person_inr: string;
}

export interface DayPlan {
  day: number;
  title: string;
  stops: ItineraryStop[];
  food: FoodRecommendation[];
  transport: string;
}

export interface BudgetBreakdown {
  local_travel: string;
  stay: string;
  food: string;
  sightseeing: string;
  activities: string;
  misc: string;
  total: string;
}

export interface TripBudget {
  low: BudgetBreakdown;
  medium: BudgetBreakdown;
  high: BudgetBreakdown;
  approx_flights_inr: string;
}

export interface IndianTravellerInfo {
  visa_or_permits: string;
  money: string;
  connectivity: string;
  power: string;
  food: string;
  safety: string;
}

export interface FlightSearchPrefill {
  origin_iata: string;
  destination_iata: string;
  depart_date: string;
  return_date: string;
  passengers: number;
}

export interface TripPlan {
  overview: string;
  best_time: string;
  arrival: ArrivalRecommendation;
  route_summary: string;
  days: DayPlan[];
  budget: TripBudget;
  indian_traveller: IndianTravellerInfo;
  seasonal_advisory: string[];
  flight_search: FlightSearchPrefill;
  disclaimer: string;
}

export interface TripState {
  destination?: string | null;
  trip_type?: "domestic" | "international" | null;
  origin_city?: string | null;
  days?: number | null;
  dates_or_month?: string | null;
  budget_tier?: "budget" | "mid-range" | "premium" | null;
  total_budget_inr?: string | null;
  group_type?: "solo" | "couple" | "family" | "friends" | null;
  group_size?: number | null;
  interests?: string[];
  food_preference?: "vegetarian" | "non-vegetarian" | "jain" | "halal" | null;
  pace?: "relaxed" | "balanced" | "packed" | null;
}

export interface PlannerChatResponse {
  state: TripState;
  question: string | null;
  chips: string[];
  progress_percent: number;
  is_ready_to_generate: boolean;
  missing_fields: string[];
}

export interface PlannerGenerateResponse {
  plan: TripPlan;
  provider: string;
}

let remotePlannerAvailable: boolean | null = null;

function checkRemoteStatus(): boolean | null {
  if (typeof window === "undefined") return null;
  if (remotePlannerAvailable !== null) return remotePlannerAvailable;
  try {
    if (sessionStorage.getItem("skyfare_remote_planner_unavailable") === "true") {
      remotePlannerAvailable = false;
      return false;
    }
  } catch {
    // ignore
  }
  return null;
}

function markRemoteUnavailable(): void {
  remotePlannerAvailable = false;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("skyfare_remote_planner_unavailable", "true");
    } catch {
      // ignore
    }
  }
}

export async function sendPlannerChatApi(
  message: string,
  state: TripState,
): Promise<PlannerChatResponse> {
  // If remote planner is unavailable or cold-starting, respond instantly in 0ms
  if (checkRemoteStatus() === false) {
    return localPlannerChatFallback(message, state);
  }

  // Use a fast timeout (800ms) so users never wait on cold starts, network latency, or 404s
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 800) : null;

  try {
    const res = await apiRequest<PlannerChatResponse>("planner/chat", {
      method: "POST",
      body: JSON.stringify({ message, state }),
      signal: controller?.signal,
    });
    remotePlannerAvailable = true;
    return res;
  } catch {
    markRemoteUnavailable();
    return localPlannerChatFallback(message, state);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function generateTripPlanApi(
  state: TripState,
): Promise<PlannerGenerateResponse> {
  if (checkRemoteStatus() === false) {
    return localGeneratePlanFallback(state);
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 2000) : null;

  try {
    const res = await apiRequest<PlannerGenerateResponse>("planner/generate", {
      method: "POST",
      body: JSON.stringify({ state }),
      signal: controller?.signal,
    });
    remotePlannerAvailable = true;
    return res;
  } catch {
    markRemoteUnavailable();
    return localGeneratePlanFallback(state);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
