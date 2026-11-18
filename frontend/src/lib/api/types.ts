export interface UserPublic {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  company_name?: string | null;
  gstin?: string | null;
  membership?: {
    tier: string;
    miles: number;
    enrolled_at: string;
  } | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: UserPublic;
  tokens: TokenPair;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  company_name?: string;
  gstin?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Money {
  currency: "INR" | "USD";
  amount: string;
  total: string;
}

export interface AirlineSummary {
  code: string;
  name: string;
}

export interface AirportSummary {
  code: string;
  city: string;
  name: string;
}

export interface FlightOffer {
  fare_id: string;
  flight_id: string;
  flight_number: string;
  airline: AirlineSummary;
  origin: AirportSummary;
  destination: AirportSummary;
  depart_at: string;
  arrive_at: string;
  depart_on: string;
  duration_minutes: number;
  stops: number;
  aircraft: string;
  cabin: "economy" | "premium_economy" | "business" | "first";
  seats_available: number;
  price: Money;
  source: "market" | "catalog";
  detail?: string | null;
  airline_logo?: string | null;
}

export interface SearchCriteria {
  origin: string;
  destination: string;
  via?: string | null;
  departure: string;
  return_date?: string | null;
  trip_type: "one-way" | "round-trip" | "multi-city";
  cabin: "economy" | "premium_economy" | "business" | "first";
  travellers: number;
  direct_only: boolean;
  flexible_dates: boolean;
  currency: "INR" | "USD";
  sort: "cheapest" | "fastest" | "best" | "departure";
}

export interface SearchResponse {
  criteria: SearchCriteria;
  outbound: FlightOffer[];
  inbound?: FlightOffer[] | null;
  onward?: FlightOffer[] | null;
  source: "market" | "catalog";
  notice?: string | null;
}

export interface BookingSegment {
  id: string;
  fare_id: string;
  leg_order: number;
  flight_number: string;
  airline_name: string;
  origin_code: string;
  destination_code: string;
  depart_at: string;
  arrive_at: string;
  cabin: string;
  unit_amount: string;
  line_amount: string;
}

export interface Passenger {
  id: string;
  full_name: string;
  title?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  passenger_type?: "adult" | "child" | "infant";
  gender?: string | null;
  nationality?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  seat_number?: string | null;
  ticket_number?: string | null;
}

export interface SeatReservationPublic {
  id: string;
  flight_id: string;
  passenger_id?: string | null;
  seat_number: string;
  seat_class: string;
  price_inr: string;
  price_usd: string;
  status: "held" | "confirmed" | "released";
}

export interface BookingAddonPublic {
  id: string;
  passenger_id?: string | null;
  category: string;
  code: string;
  title: string;
  price_inr: string;
  price_usd: string;
}

export interface PaymentTransactionPublic {
  id: string;
  transaction_ref: string;
  payment_method: string;
  amount: string;
  currency: string;
  status: string;
  card_brand?: string | null;
  card_last4?: string | null;
  upi_vpa?: string | null;
  bank_name?: string | null;
  created_at: string;
}

export interface CancellationPublic {
  reason?: string | null;
  cancellation_fee: string;
  refund_amount: string;
  refund_status: string;
  refund_reference: string;
  created_at: string;
}

export interface BookingPublic {
  id: string;
  reference: string;
  status: "reserved" | "confirmed" | "cancelled" | "INITIATED" | "PENDING" | "SEATS_HELD" | "PAYMENT_PENDING" | "PAYMENT_FAILED" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | string;
  trip_type: string;
  cabin: string;
  currency: "INR" | "USD";
  total_amount: string;
  traveller_count: number;
  corporate_travel: boolean;
  payment_status: string;
  created_at: string;
  cancelled_at?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  held_until?: string | null;
  base_amount?: string | null;
  taxes_amount?: string | null;
  seats_amount?: string | null;
  addons_amount?: string | null;
  convenience_fee?: string | null;
  fare_tier?: string | null;
  pricing_snapshot?: Record<string, unknown> | null;
  segments: BookingSegment[];
  passengers: Passenger[];
  seat_reservations?: SeatReservationPublic[];
  addons?: BookingAddonPublic[];
  payments?: PaymentTransactionPublic[];
  cancellation?: CancellationPublic | null;
}

export interface PassengerCreate {
  full_name?: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  passenger_type?: "adult" | "child" | "infant";
  gender?: string;
  nationality?: string;
  passport_number?: string;
  passport_expiry?: string;
  seat_number?: string;
}

export interface SeatSelectionItem {
  flight_id: string;
  passenger_index: number;
  seat_number: string;
  seat_class?: string;
  price?: number;
}

export interface AddonSelectionItem {
  passenger_index?: number | null;
  category: string;
  code: string;
  title: string;
  price: number;
}

export interface BookingCreate {
  fare_ids: string[];
  trip_type: "one-way" | "round-trip" | "multi-city";
  currency: "INR" | "USD";
  corporate_travel?: boolean;
  fare_tier?: "saver" | "flexi" | "executive";
  contact_email?: string;
  contact_phone?: string;
  passengers: PassengerCreate[];
  seats?: SeatSelectionItem[];
  addons?: AddonSelectionItem[];
}

export interface SeatMapSeat {
  seat_number: string;
  row: number;
  col: string;
  seat_class: string;
  price_inr: string;
  price_usd: string;
  status: "available" | "occupied" | "held";
}

export interface SeatMapResponse {
  flight_id: string;
  flight_number: string;
  aircraft: string;
  cabin: string;
  rows: number;
  layout: string;
  seats: SeatMapSeat[];
}

export interface AddonOption {
  category: string;
  code: string;
  title: string;
  description: string;
  price_inr: string;
  price_usd: string;
  icon?: string;
}

export interface PriceBreakdown {
  currency: "INR" | "USD";
  base_fare: string;
  taxes_and_fees: string;
  seats_fee: string;
  addons_fee: string;
  convenience_fee: string;
  discount: string;
  total: string;
}

export interface PaymentRequest {
  payment_method: "card" | "upi" | "netbanking" | "wallet";
  card_number?: string;
  card_holder?: string;
  expiry_month?: string;
  expiry_year?: string;
  cvv?: string;
  upi_vpa?: string;
  bank_name?: string;
  idempotency_key?: string;
  simulate_outcome?: "success" | "fail" | "timeout";
}

export interface PaymentResponse {
  transaction_ref: string;
  booking_reference: string;
  status: "success" | "failed" | "pending" | "processing";
  amount: string;
  currency: string;
  payment_method: string;
  error_message?: string | null;
  created_at: string;
  booking?: BookingPublic | null;
}

