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
  date_of_birth?: string | null;
}

export interface BookingPublic {
  id: string;
  reference: string;
  status: "reserved" | "confirmed" | "cancelled";
  trip_type: string;
  cabin: string;
  currency: "INR" | "USD";
  total_amount: string;
  traveller_count: number;
  corporate_travel: boolean;
  payment_status: string;
  created_at: string;
  cancelled_at?: string | null;
  segments: BookingSegment[];
  passengers: Passenger[];
}

export interface PassengerCreate {
  full_name: string;
  date_of_birth?: string;
}

export interface BookingCreate {
  fare_ids: string[];
  trip_type: "one-way" | "round-trip" | "multi-city";
  currency: "INR" | "USD";
  corporate_travel?: boolean;
  passengers: PassengerCreate[];
}
