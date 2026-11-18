import { getStoredAccessToken, getStoredUser } from "./client";
import type {
  AddonOption,
  BookingAddonPublic,
  BookingCreate,
  BookingPublic,
  BookingSegment,
  FlightOffer,
  Passenger,
  PaymentRequest,
  PaymentResponse,
  PaymentTransactionPublic,
  PriceBreakdown,
  SeatMapResponse,
  SeatMapSeat,
  SeatReservationPublic,
} from "./types";

export function getApiBase(): string {
  if (typeof window !== "undefined" && (window as unknown as { __SKYFARE_API_URL__?: string }).__SKYFARE_API_URL__) {
    return (window as unknown as { __SKYFARE_API_URL__?: string }).__SKYFARE_API_URL__!;
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "http://127.0.0.1:8000";
}

const API_BASE = getApiBase();

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
 * Retrieve user's saved flight bookings from local storage
 */
export function getLocalBookings(userEmail?: string): BookingPublic[] {
  if (typeof window === "undefined") return [];
  try {
    const user = getStoredUser<{ email?: string }>();
    const email = (userEmail || user?.email || "anonymous").toLowerCase().trim();
    const userKey = `skyfare_bookings_${email}`;
    const rawUser = localStorage.getItem(userKey);
    const rawRecent = localStorage.getItem("skyfare_recent_bookings");

    const userList: BookingPublic[] = rawUser ? JSON.parse(rawUser) : [];
    const recentList: BookingPublic[] = rawRecent ? JSON.parse(rawRecent) : [];

    const map = new Map<string, BookingPublic>();
    recentList.forEach((b) => map.set(b.reference, b));
    userList.forEach((b) => map.set(b.reference, b));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  } catch {
    return [];
  }
}

/**
 * Persist flight booking to local storage under current user and global recent list
 */
export function saveLocalBooking(booking: BookingPublic, userEmail?: string): void {
  if (typeof window === "undefined") return;
  try {
    const user = getStoredUser<{ email?: string }>();
    const email = (userEmail || user?.email || booking.contact_email || "anonymous").toLowerCase().trim();
    const userKey = `skyfare_bookings_${email}`;

    // Update user-specific list
    const current = getLocalBookings(email);
    const updated = [booking, ...current.filter((b) => b.reference !== booking.reference)];
    localStorage.setItem(userKey, JSON.stringify(updated));

    // If a user account is currently signed in, also sync under their account key
    if (user?.email && user.email.toLowerCase().trim() !== email) {
      const authUserKey = `skyfare_bookings_${user.email.toLowerCase().trim()}`;
      const authCurrent = getLocalBookings(user.email);
      const authUpdated = [booking, ...authCurrent.filter((b) => b.reference !== booking.reference)];
      localStorage.setItem(authUserKey, JSON.stringify(authUpdated));
    }

    // Update global recent list
    const rawRecent = localStorage.getItem("skyfare_recent_bookings");
    const recentList: BookingPublic[] = rawRecent ? JSON.parse(rawRecent) : [];
    const updatedRecent = [booking, ...recentList.filter((b) => b.reference !== booking.reference)];
    localStorage.setItem("skyfare_recent_bookings", JSON.stringify(updatedRecent.slice(0, 30)));

    // Emit event for real-time reactivity across components and tabs
    window.dispatchEvent(new CustomEvent("skyfare:booking_updated", { detail: booking }));
  } catch (err) {
    console.warn("Could not save booking locally:", err);
  }
}

/**
 * Generate a realistic simulated booking object when backend is unreachable
 */
export function generateSimulatedBooking(
  payload: BookingCreate,
  context?: {
    flight?: FlightOffer | null;
    returnFlight?: FlightOffer | null;
    breakdown?: PriceBreakdown | null;
  },
): BookingPublic {
  const flight = context?.flight;
  const returnFlight = context?.returnFlight;
  const breakdown = context?.breakdown;
  const user = getStoredUser<{ email?: string; full_name?: string }>();

  const reference = `SF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date();
  const heldUntil = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  // Create segments
  const segments: BookingSegment[] = [];
  if (flight) {
    segments.push({
      id: `seg-${Math.random().toString(36).substring(2, 9)}`,
      fare_id: flight.fare_id,
      leg_order: 1,
      flight_number: flight.flight_number,
      airline_name: flight.airline.name,
      origin_code: flight.origin.code,
      destination_code: flight.destination.code,
      depart_at: flight.depart_at,
      arrive_at: flight.arrive_at,
      cabin: flight.cabin || "Economy",
      unit_amount: flight.price.total,
      line_amount: flight.price.total,
    });
  } else {
    segments.push({
      id: `seg-1`,
      fare_id: payload.fare_ids[0] || "fare-1",
      leg_order: 1,
      flight_number: "6E 234",
      airline_name: "IndiGo",
      origin_code: "CCU",
      destination_code: "MAA",
      depart_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      arrive_at: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
      cabin: "Economy",
      unit_amount: "4500.00",
      line_amount: "4500.00",
    });
  }

  if (returnFlight) {
    segments.push({
      id: `seg-${Math.random().toString(36).substring(2, 9)}`,
      fare_id: returnFlight.fare_id,
      leg_order: 2,
      flight_number: returnFlight.flight_number,
      airline_name: returnFlight.airline.name,
      origin_code: returnFlight.origin.code,
      destination_code: returnFlight.destination.code,
      depart_at: returnFlight.depart_at,
      arrive_at: returnFlight.arrive_at,
      cabin: returnFlight.cabin || "Economy",
      unit_amount: returnFlight.price.total,
      line_amount: returnFlight.price.total,
    });
  }

  // Passengers
  const passengers: Passenger[] = (payload.passengers || []).map((p, idx) => {
    const seatItem = (payload.seats || []).find((s) => s.passenger_index === idx);
    return {
      id: `pax-${idx + 1}`,
      full_name: p.full_name || `${p.title || "Mr"} ${p.first_name || ""} ${p.last_name || ""}`.trim() || `Passenger ${idx + 1}`,
      title: p.title || "Mr",
      first_name: p.first_name || (idx === 0 ? user?.full_name?.split(" ")[0] : "Passenger"),
      last_name: p.last_name || (idx === 0 ? user?.full_name?.split(" ").slice(1).join(" ") : `${idx + 1}`),
      date_of_birth: p.date_of_birth || "1990-01-01",
      passenger_type: p.passenger_type || "adult",
      gender: p.gender || "male",
      nationality: p.nationality || "Indian",
      passport_number: p.passport_number || null,
      passport_expiry: p.passport_expiry || null,
      seat_number: seatItem?.seat_number || null,
      ticket_number: null,
    };
  });

  // Seat reservations
  const seat_reservations: SeatReservationPublic[] = (payload.seats || []).map((s, idx) => ({
    id: `seat-res-${idx + 1}`,
    flight_id: s.flight_id,
    passenger_id: `pax-${s.passenger_index + 1}`,
    seat_number: s.seat_number,
    seat_class: s.seat_class || "standard",
    price_inr: (s.price || 0).toFixed(2),
    price_usd: ((s.price || 0) / 80).toFixed(2),
    status: "held",
  }));

  // Addons
  const addons: BookingAddonPublic[] = (payload.addons || []).map((a, idx) => ({
    id: `addon-${idx + 1}`,
    passenger_id: a.passenger_index != null ? `pax-${a.passenger_index + 1}` : null,
    category: a.category || "extra",
    code: a.code,
    title: a.title || a.code,
    price_inr: (a.price || 0).toFixed(2),
    price_usd: ((a.price || 0) / 80).toFixed(2),
  }));

  const currency = payload.currency || flight?.price.currency || "INR";
  const totalAmount = breakdown ? breakdown.total : flight ? flight.price.total : "5790.00";

  return {
    id: `bk-${Math.random().toString(36).substring(2, 10)}`,
    reference,
    status: "SEATS_HELD",
    trip_type: payload.trip_type,
    cabin: flight?.cabin || "Economy",
    currency,
    total_amount: totalAmount,
    traveller_count: passengers.length || 1,
    corporate_travel: Boolean(payload.corporate_travel),
    payment_status: "pending",
    created_at: now.toISOString(),
    cancelled_at: null,
    contact_email: payload.contact_email || user?.email || "traveller@skyfare.com",
    contact_phone: payload.contact_phone || "+91 98765 43210",
    held_until: heldUntil,
    base_amount: breakdown?.base_fare || (currency === "INR" ? "4500.00" : "60.00"),
    taxes_amount: breakdown?.taxes_and_fees || (currency === "INR" ? "990.00" : "12.00"),
    seats_amount: breakdown?.seats_fee || "0.00",
    addons_amount: breakdown?.addons_fee || "0.00",
    convenience_fee: breakdown?.convenience_fee || (currency === "INR" ? "300.00" : "4.00"),
    fare_tier: payload.fare_tier || "saver",
    pricing_snapshot: breakdown ? (breakdown as unknown as Record<string, unknown>) : null,
    segments,
    passengers,
    seat_reservations,
    addons,
    payments: [],
    cancellation: null,
  };
}

/**
 * Execute simulated payment and lock booking in confirmed state
 */
export function executeSimulatedPayment(
  reference: string,
  payload: PaymentRequest,
): PaymentResponse {
  const allBookings = getLocalBookings();
  let booking = allBookings.find((b) => b.reference === reference);

  if (!booking) {
    booking = {
      id: `bk-${Math.random().toString(36).substring(2, 10)}`,
      reference,
      status: "CONFIRMED",
      trip_type: "one-way",
      cabin: "Economy",
      currency: "INR",
      total_amount: "5790.00",
      traveller_count: 1,
      corporate_travel: false,
      payment_status: "paid",
      created_at: new Date().toISOString(),
      segments: [],
      passengers: [],
    };
  }

  // Mark confirmed
  booking.status = "CONFIRMED";
  booking.payment_status = "paid";
  booking.held_until = null;

  // Assign ticket number to passengers
  booking.passengers = (booking.passengers || []).map((p, idx) => ({
    ...p,
    ticket_number: `098-${Math.floor(1000000000 + idx * 1111 + Math.random() * 900000000)}`,
  }));

  // Confirm seats
  if (booking.seat_reservations) {
    booking.seat_reservations = booking.seat_reservations.map((s) => ({
      ...s,
      status: "confirmed",
    }));
  }

  const txnRef = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const paymentRecord: PaymentTransactionPublic = {
    id: `pay-${Math.random().toString(36).substring(2, 9)}`,
    transaction_ref: txnRef,
    payment_method: payload.payment_method,
    amount: booking.total_amount,
    currency: booking.currency,
    status: "completed",
    card_brand: payload.payment_method === "card" ? (payload.card_number?.startsWith("4") ? "Visa" : "Mastercard") : null,
    card_last4: payload.payment_method === "card" && payload.card_number ? payload.card_number.slice(-4) : null,
    upi_vpa: payload.upi_vpa || null,
    bank_name: payload.bank_name || null,
    created_at: new Date().toISOString(),
  };

  booking.payments = [paymentRecord];

  // Save to user storage
  saveLocalBooking(booking, booking.contact_email || undefined);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("skyfare:booking_confirmed", { detail: booking }));
  }

  return {
    transaction_ref: txnRef,
    booking_reference: reference,
    status: "success",
    amount: booking.total_amount,
    currency: booking.currency,
    payment_method: payload.payment_method,
    error_message: null,
    created_at: new Date().toISOString(),
    booking,
  };
}

/**
 * Create a flight reservation (holds seats for 10 minutes)
 */
export async function createBookingEnhancedApi(
  payload: BookingCreate,
  context?: {
    flight?: FlightOffer | null;
    returnFlight?: FlightOffer | null;
    breakdown?: PriceBreakdown | null;
  },
): Promise<BookingPublic> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${getApiBase()}/api/v1/bookings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: BookingPublic = await res.json();
      saveLocalBooking(data, payload.contact_email);
      return data;
    }
  } catch {
    // Backend offline / network failed (e.g. running on Vercel)
  }

  // Gracefully fallback to simulated reservation
  const simulated = generateSimulatedBooking(payload, context);
  saveLocalBooking(simulated, payload.contact_email);
  return simulated;
}

/**
 * Pay for a held booking via simulated gateway
 */
export async function payBookingApi(
  reference: string,
  payload: PaymentRequest,
): Promise<PaymentResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${getApiBase()}/api/v1/bookings/${reference}/pay`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: PaymentResponse = await res.json();
      if (data.booking) {
        saveLocalBooking(data.booking);
      }
      return data;
    }
  } catch {
    // Backend offline / payment endpoint unreachable
  }

  return executeSimulatedPayment(reference, payload);
}

/**
 * Cancel a booking with refund simulation
 */
export async function cancelBookingEnhancedApi(
  reference: string,
  payload?: { reason: string },
): Promise<BookingPublic> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${getApiBase()}/api/v1/bookings/${reference}/cancel`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload || { reason: "Voluntary cancellation" }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const updated: BookingPublic = await res.json();
      saveLocalBooking(updated);
      return updated;
    }
  } catch {
    // Fallback cancellation
  }

  const allBookings = getLocalBookings();
  const target = allBookings.find((b) => b.reference === reference);
  if (target) {
    target.status = "CANCELLED";
    target.cancelled_at = new Date().toISOString();
    target.cancellation = {
      reason: payload?.reason || "Voluntary cancellation",
      cancellation_fee: (parseFloat(target.total_amount) * 0.15).toFixed(2),
      refund_amount: (parseFloat(target.total_amount) * 0.85).toFixed(2),
      refund_status: "refunded",
      refund_reference: `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      created_at: new Date().toISOString(),
    };
    saveLocalBooking(target);
    return target;
  }

  throw new Error("Booking reference not found.");
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
