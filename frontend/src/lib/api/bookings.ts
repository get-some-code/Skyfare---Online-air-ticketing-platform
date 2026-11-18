import { getStoredAccessToken } from "./client";
import type {
  AddonOption,
  BookingCreate,
  BookingPublic,
  PaymentRequest,
  PaymentResponse,
  PriceBreakdown,
  SeatMapResponse,
  SeatMapSeat,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getHeaders(customHeaders?: HeadersInit): HeadersInit {
  const token = typeof window !== "undefined" ? getStoredAccessToken() : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
}

/**
 * Fetch visual aircraft seat map with live occupied/held states
 */
export async function getSeatMapApi(flightId: string): Promise<SeatMapResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/bookings/seats/${flightId}`, {
      headers: getHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to client simulation
  }

  return generateFallbackSeatMap(flightId);
}

/**
 * Fetch available commercial add-ons (extra baggage, meals, priority services)
 */
export async function getAddonsApi(): Promise<AddonOption[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/bookings/addons`, {
      headers: getHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }

  return [
    {
      category: "baggage",
      code: "BAG_5KG",
      title: "Extra Checked Baggage (+5 Kg)",
      description: "Prepaid 5 kg check-in baggage allowance for peace of mind.",
      price_inr: "1200.00",
      price_usd: "15.00",
      icon: "luggage",
    },
    {
      category: "baggage",
      code: "BAG_10KG",
      title: "Extra Checked Baggage (+10 Kg)",
      description: "Heavy luggage discounted bundle (+10 kg checked).",
      price_inr: "2200.00",
      price_usd: "28.00",
      icon: "luggage",
    },
    {
      category: "meal",
      code: "MEAL_HINDU_VEG",
      title: "Royal Indian Vegetarian Thali",
      description: "Warm gourmet meal with paneer, dal makhani, jeera rice, and gulab jamun.",
      price_inr: "380.00",
      price_usd: "5.00",
      icon: "utensils",
    },
    {
      category: "meal",
      code: "MEAL_JAIN",
      title: "Jain Satvik Meal",
      description: "Pure vegetarian meal prepared without root vegetables, garlic, or onions.",
      price_inr: "380.00",
      price_usd: "5.00",
      icon: "utensils",
    },
    {
      category: "meal",
      code: "MEAL_CHEF_SPECIAL",
      title: "Chef's Continental Gourmet Platter",
      description: "Artisanal grilled entree with fresh sourdough roll, salad, and chocolate mousse.",
      price_inr: "550.00",
      price_usd: "7.00",
      icon: "utensils",
    },
    {
      category: "priority",
      code: "PRIORITY_BOARDING",
      title: "Priority Check-in & Express Boarding",
      description: "Dedicated business check-in counter and Zone 1 aircraft boarding.",
      price_inr: "450.00",
      price_usd: "6.00",
      icon: "zap",
    },
    {
      category: "assistance",
      code: "SPECIAL_ASSIST",
      title: "Wheelchair & Airport Meet Assistance",
      description: "Complimentary wheelchair and escort support from terminal entrance to seat.",
      price_inr: "0.00",
      price_usd: "0.00",
      icon: "heart-handshake",
    },
  ];
}

/**
 * Calculate transparent, itemized server-authoritative price breakdown
 */
export async function calculatePriceApi(payload: {
  fare_ids: string[];
  travellers: number;
  fare_tier?: string;
  currency?: "INR" | "USD";
  seats?: Array<{ flight_id: string; passenger_index: number; seat_number: string; price?: number }>;
  addons?: Array<{ code: string; price: number }>;
}): Promise<PriceBreakdown> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/bookings/pricing`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback calculation
  }

  const travellers = payload.travellers || 1;
  const currency = payload.currency || "INR";
  const tier = payload.fare_tier || "saver";
  const tierMultiplier = tier === "flexi" ? 1.18 : tier === "executive" ? 1.45 : 1.0;

  const basePerPerson = currency === "INR" ? 4500 : 60;
  const baseFare = Math.round(basePerPerson * travellers * tierMultiplier);
  const taxes = Math.round(baseFare * 0.12 + 450 * travellers);

  let seatsFee = (payload.seats || []).reduce((acc, s) => acc + (s.price || 0), 0);
  if (tier === "flexi" || tier === "executive") {
    seatsFee = Math.round(seatsFee * 0.5);
  }

  const addonsFee = (payload.addons || []).reduce((acc, a) => acc + (a.price || 0), 0);
  const convenience = currency === "INR" ? 300 : 4;
  const total = baseFare + taxes + seatsFee + addonsFee + convenience;

  return {
    currency,
    base_fare: baseFare.toFixed(2),
    taxes_and_fees: taxes.toFixed(2),
    seats_fee: seatsFee.toFixed(2),
    addons_fee: addonsFee.toFixed(2),
    convenience_fee: convenience.toFixed(2),
    discount: "0.00",
    total: total.toFixed(2),
  };
}

/**
 * Create a flight reservation (holds seats for 10 minutes)
 */
export async function createBookingEnhancedApi(payload: BookingCreate): Promise<BookingPublic> {
  const res = await fetch(`${API_BASE}/api/v1/bookings`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create flight reservation.");
  }

  return res.json();
}

/**
 * Pay for a held booking via simulated gateway
 */
export async function payBookingApi(
  reference: string,
  payload: PaymentRequest,
): Promise<PaymentResponse> {
  const res = await fetch(`${API_BASE}/api/v1/bookings/${reference}/pay`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Payment simulation failed.");
  }

  return res.json();
}

/**
 * Cancel a booking with refund simulation
 */
export async function cancelBookingEnhancedApi(
  reference: string,
  payload?: { reason: string },
): Promise<BookingPublic> {
  const res = await fetch(`${API_BASE}/api/v1/bookings/${reference}/cancel`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload || { reason: "Voluntary cancellation" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Cancellation failed.");
  }

  return res.json();
}

/**
 * Download URL for official ticket PDF
 */
export function downloadTicketPdfUrl(reference: string): string {
  return `${API_BASE}/api/v1/bookings/${reference.toUpperCase()}/ticket.pdf`;
}

/**
 * Generates an Airbus A320 30-row 3-3 seat configuration for interactive preview
 */
function generateFallbackSeatMap(flightId: string): SeatMapResponse {
  const cols = ["A", "B", "C", "D", "E", "F"];
  const seats: SeatMapSeat[] = [];

  for (let row = 1; row <= 30; row++) {
    for (const col of cols) {
      const seatNum = `${row}${col}`;
      let seatClass = "standard";
      let priceInr = "0.00";
      let priceUsd = "0.00";

      if (row <= 4) {
        seatClass = "front_row";
        priceInr = "600.00";
        priceUsd = "8.00";
      } else if (row === 12 || row === 13 || row === 14) {
        seatClass = "emergency_exit";
        priceInr = "850.00";
        priceUsd = "11.00";
      } else if (row <= 10) {
        seatClass = "extra_legroom";
        priceInr = "350.00";
        priceUsd = "5.00";
      } else if (col === "A" || col === "F" || col === "C" || col === "D") {
        priceInr = "200.00";
        priceUsd = "3.00";
      }

      // Pseudo-deterministic occupancy for realistic layout
      const isOccupied = (row * 7 + col.charCodeAt(0)) % 5 === 0;

      seats.push({
        seat_number: seatNum,
        row,
        col,
        seat_class: seatClass,
        price_inr: priceInr,
        price_usd: priceUsd,
        status: isOccupied ? "occupied" : "available",
      });
    }
  }

  return {
    flight_id: flightId,
    flight_number: "SF 302",
    aircraft: "Airbus A320neo",
    cabin: "Economy",
    rows: 30,
    layout: "3-3",
    seats,
  };
}
