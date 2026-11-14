"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { BookingModal } from "@/components/bookings/booking-modal";
import { useCurrency } from "@/components/site/currency-context";
import { Icon } from "@/components/ui/icon";
import { apiRequest } from "@/lib/api/client";
import type { FlightOffer, SearchResponse } from "@/lib/api/types";

export default function SearchPage() {
  return (
    <main className="search-results-page">
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResultsContent />
      </Suspense>
    </main>
  );
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const { currency } = useCurrency();

  // Extract criteria from URL parameters
  const origin = (searchParams.get("origin") ?? "DEL").toUpperCase();
  const destination = (searchParams.get("destination") ?? "BOM").toUpperCase();
  const departure = searchParams.get("departure") ?? new Date().toISOString().split("T")[0];
  const returnDate = searchParams.get("return") ?? "";
  const travellers = Number(searchParams.get("travellers") ?? "1");
  const cabinParam = searchParams.get("cabin") ?? "Economy";
  const tripType = searchParams.get("tripType") ?? "one-way";
  const directOnlyParam = searchParams.get("directOnly") === "true";

  // State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<"cheapest" | "fastest" | "best" | "departure">("cheapest");

  // Sidebar filters
  const [stopsFilter, setStopsFilter] = useState<"all" | "0" | "1">(directOnlyParam ? "0" : "all");
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState<"all" | "early" | "morning" | "afternoon" | "evening">("all");

  // Booking modal
  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(null);

  useEffect(() => {
    let ignore = false;

    const query = new URLSearchParams({
      origin: origin.slice(0, 3),
      destination: destination.slice(0, 3),
      departure,
      tripType,
      cabin: cabinParam,
      travellers: String(travellers),
      currency,
      sort,
    });

    if (returnDate && tripType === "round-trip") {
      query.set("return", returnDate);
    }
    if (directOnlyParam) {
      query.set("directOnly", "true");
    }

    apiRequest<SearchResponse>(`flights/search?${query.toString()}`)
      .then((res) => {
        if (!ignore) {
          setData(res);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load flight availability.");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [origin, destination, departure, returnDate, tripType, cabinParam, travellers, currency, sort, directOnlyParam]);

  const formattedDeparture = departure
    ? new Date(departure + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : "—";

  const formattedReturn = returnDate
    ? new Date(returnDate + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      })
    : null;

  const routeLabel =
    tripType === "round-trip"
      ? `${origin} ⇄ ${destination}`
      : `${origin} → ${destination}`;

  // Unique airlines from results
  const availableAirlines = useMemo(() => {
    if (!data?.outbound) return [];
    const set = new Set<string>();
    data.outbound.forEach((f) => set.add(f.airline.name));
    return Array.from(set);
  }, [data]);

  // Filtered flights
  const filteredFlights = useMemo(() => {
    if (!data?.outbound) return [];
    let list = [...data.outbound];

    // Stops filter
    if (stopsFilter === "0") {
      list = list.filter((f) => f.stops === 0);
    } else if (stopsFilter === "1") {
      list = list.filter((f) => f.stops === 1);
    }

    // Airlines filter
    if (selectedAirlines.length > 0) {
      list = list.filter((f) => selectedAirlines.includes(f.airline.name));
    }

    // Time filter
    if (timeFilter !== "all") {
      list = list.filter((f) => {
        const hour = new Date(f.depart_at).getHours();
        if (timeFilter === "early") return hour < 6;
        if (timeFilter === "morning") return hour >= 6 && hour < 12;
        if (timeFilter === "afternoon") return hour >= 12 && hour < 18;
        if (timeFilter === "evening") return hour >= 18;
        return true;
      });
    }

    // Sort
    if (sort === "fastest") {
      list.sort((a, b) => a.duration_minutes - b.duration_minutes);
    } else if (sort === "departure") {
      list.sort((a, b) => new Date(a.depart_at).getTime() - new Date(b.depart_at).getTime());
    } else {
      // cheapest / best
      list.sort((a, b) => Number(a.price.total) - Number(b.price.total));
    }

    return list;
  }, [data, stopsFilter, selectedAirlines, timeFilter, sort]);

  function toggleAirline(name: string) {
    setSelectedAirlines((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
    );
  }

  function resetFilters() {
    setStopsFilter("all");
    setSelectedAirlines([]);
    setTimeFilter("all");
  }

  return (
    <>
      {/* Search Header Bar */}
      <div className="search-bar">
        <div className="search-bar__inner">
          <div className="search-bar__route">
            <span className="search-bar__route-icon" aria-hidden="true">
              <PlaneIcon />
            </span>
            <div>
              <strong className="search-bar__route-label">{routeLabel}</strong>
              <span className="search-bar__route-meta">
                {tripType === "round-trip" ? "Round-trip" : tripType === "one-way" ? "One-way" : "Multi-city"}
                {" · "}
                {formattedDeparture}
                {formattedReturn ? ` – ${formattedReturn}` : ""}
                {" · "}
                {travellers} {travellers === 1 ? "Adult" : "Adults"}
                {" · "}
                {cabinParam}
                {directOnlyParam ? " · Direct only" : ""}
              </span>
            </div>
          </div>
          <Link href="/#search" className="button button--secondary button--small search-bar__modify">
            <SearchIcon />
            Modify Search
          </Link>
        </div>
      </div>

      <div className="search-results-layout">
        {/* Sidebar Filters */}
        <aside className="search-filters" aria-label="Refine results">
          <div className="search-filters__header">
            <FilterIcon />
            <span>Refine Results</span>
            <button
              type="button"
              className="text-button search-filters__reset"
              onClick={resetFilters}
            >
              Reset all
            </button>
          </div>

          <div className="search-filters__group">
            <h3>Stops</h3>
            <label className="check-option">
              <input
                type="radio"
                name="stops"
                checked={stopsFilter === "all"}
                onChange={() => setStopsFilter("all")}
              />
              <span>All Flights</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="stops"
                checked={stopsFilter === "0"}
                onChange={() => setStopsFilter("0")}
              />
              <span>Non-stop (Direct)</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="stops"
                checked={stopsFilter === "1"}
                onChange={() => setStopsFilter("1")}
              />
              <span>1 Stop</span>
            </label>
          </div>

          {availableAirlines.length > 0 && (
            <div className="search-filters__group">
              <h3>Airlines</h3>
              {availableAirlines.map((airline) => (
                <label key={airline} className="check-option">
                  <input
                    type="checkbox"
                    checked={selectedAirlines.includes(airline)}
                    onChange={() => toggleAirline(airline)}
                  />
                  <span>{airline}</span>
                </label>
              ))}
            </div>
          )}

          <div className="search-filters__group">
            <h3>Departure Time</h3>
            {[
              { id: "all", label: "Any time" },
              { id: "early", label: "Early Morning (before 6 AM)" },
              { id: "morning", label: "Morning (6 AM – 12 PM)" },
              { id: "afternoon", label: "Afternoon (12 PM – 6 PM)" },
              { id: "evening", label: "Evening (after 6 PM)" },
            ].map((t) => (
              <label key={t.id} className="check-option">
                <input
                  type="radio"
                  name="time"
                  checked={timeFilter === t.id}
                  onChange={() => setTimeFilter(t.id as typeof timeFilter)}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Main Results Area */}
        <section className="search-results-main" aria-labelledby="results-heading">
          <div className="search-results-toolbar">
            <div className="search-results-toolbar__count">
              <span className="search-results-toolbar__badge">
                <SearchingIcon />
                {loading
                  ? "Searching availability…"
                  : `${filteredFlights.length} flights found`}
              </span>
              {data?.notice && (
                <span className="search-results-live-badge">
                  <Icon name="spark" size={13} />
                  {data.notice}
                </span>
              )}
            </div>

            <div className="search-results-toolbar__sort" role="group" aria-label="Sort results">
              {[
                { id: "cheapest", label: "Cheapest" },
                { id: "fastest", label: "Fastest" },
                { id: "best", label: "Best Value" },
                { id: "departure", label: "Departure" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`sort-tab${sort === s.id ? " is-active" : ""}`}
                  onClick={() => setSort(s.id as typeof sort)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="search-results-error" role="alert">
              <Icon name="spark" size={18} />
              <div>
                <strong>Could not load flight data</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Live Radar Waiting State while Fetching Flights */}
          {loading ? (
            <FlightSearchWaitingState
              origin={origin}
              destination={destination}
              formattedDeparture={formattedDeparture}
              cabin={cabinParam}
            />
          ) : filteredFlights.length === 0 ? (
            <div className="search-results-empty">
              <Icon name="plane" size={32} />
              <h3>No flights match your filters</h3>
              <p>Try resetting stops, airline selections, or choosing another date.</p>
              <button type="button" className="button button--secondary" onClick={resetFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="search-results-list" aria-label="Flight results">
              {filteredFlights.map((flight) => {
                const depTime = new Date(flight.depart_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                const arrTime = new Date(flight.arrive_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });
                const hours = Math.floor(flight.duration_minutes / 60);
                const mins = flight.duration_minutes % 60;
                const durationStr = `${hours}h ${mins > 0 ? `${mins}m` : ""}`;

                return (
                  <article key={flight.fare_id} className="flight-card">
                    <div className="flight-card__airline">
                      {flight.airline_logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={flight.airline_logo}
                          alt={flight.airline.name}
                          className="flight-card__logo"
                        />
                      ) : (
                        <div className="flight-card__airline-fallback">
                          <PlaneIcon />
                        </div>
                      )}
                      <div>
                        <strong>{flight.airline.name}</strong>
                        <span className="flight-card__flight-no">
                          {flight.flight_number} · {flight.aircraft}
                        </span>
                      </div>
                    </div>

                    <div className="flight-card__times">
                      <div className="flight-card__time-point">
                        <strong>{depTime}</strong>
                        <span>{flight.origin.code}</span>
                      </div>

                      <div className="flight-card__duration-block">
                        <span className="flight-card__duration-text">{durationStr}</span>
                        <div className="flight-card__flight-line">
                          <span className="flight-card__dot" />
                          <div className="flight-card__track" />
                          <span className="flight-card__dot" />
                        </div>
                        <span className="flight-card__stops">
                          {flight.stops === 0 ? "Non-stop" : `${flight.stops} stop`}
                        </span>
                      </div>

                      <div className="flight-card__time-point">
                        <strong>{arrTime}</strong>
                        <span>{flight.destination.code}</span>
                      </div>
                    </div>

                    <div className="flight-card__price-block">
                      <span className="flight-card__cabin-tag">
                        {flight.cabin.replace("_", " ").toUpperCase()}
                      </span>
                      <strong className="flight-card__amount">
                        {flight.price.currency === "INR" ? "₹" : "$"}
                        {Number(flight.price.total).toLocaleString()}
                      </strong>
                      <span className="flight-card__price-sub">
                        per traveler · taxes incl.
                      </span>
                      <button
                        type="button"
                        className="button button--primary button--small flight-card__book-btn"
                        onClick={() => setSelectedFlight(flight)}
                      >
                        Book Flight
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Connection status notice */}
          <div className="search-results-notice" role="status">
            <InfoIcon />
            <div>
              <strong>Live flight inventory is being connected</strong>
              <p>
                Real-time fares, seat availability, and airline data from Google Flights
                and AviationStack are dynamically refreshed. Your search criteria —{" "}
                <strong>
                  {origin} → {destination}
                </strong>{" "}
                on {formattedDeparture} — is active.
              </p>
              <Link href="/#search" className="button button--secondary button--small">
                Search another route
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Flight Reservation Modal */}
      <BookingModal
        flight={selectedFlight}
        onClose={() => setSelectedFlight(null)}
      />
    </>
  );
}

const WAITING_MESSAGES = [
  "Connecting to global airline distribution systems (GDS) & live commercial inventory…",
  "Scanning real-time seat availability across 500+ commercial carriers & charters…",
  "Comparing lowest fare brackets, GST input tax credits, and baggage allowances…",
  "Locking in executive schedules and guaranteed real-time availability…",
];

const AIRPORT_CITIES: Record<string, string> = {
  DEL: "New Delhi",
  CCU: "Kolkata",
  BOM: "Mumbai",
  BLR: "Bengaluru",
  MAA: "Chennai",
  HYD: "Hyderabad",
  GOI: "Goa",
  DXB: "Dubai",
  AMD: "Ahmedabad",
  PNQ: "Pune",
  COK: "Kochi",
  JAI: "Jaipur",
};

interface FlightSearchWaitingStateProps {
  origin: string;
  destination: string;
  formattedDeparture: string;
  cabin: string;
}

function FlightSearchWaitingState({
  origin,
  destination,
  formattedDeparture,
  cabin,
}: FlightSearchWaitingStateProps) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % WAITING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const originCity = AIRPORT_CITIES[origin] ?? origin;
  const destCity = AIRPORT_CITIES[destination] ?? destination;

  return (
    <div className="search-waiting-container" aria-live="polite">
      {/* Prominent Live Radar Waiting Card */}
      <div className="search-live-radar-card">
        <div className="search-live-radar__header">
          <div className="search-radar-airport">
            <span className="search-radar-city">{originCity}</span>
            <strong className="search-radar-code">{origin}</strong>
          </div>

          <div className="search-radar-corridor">
            <div className="search-radar-line">
              <span className="search-radar-plane-icon" aria-hidden="true">
                ✈
              </span>
              <div className="search-radar-pulse-dot" />
            </div>
            <span className="search-radar-flight-tag">
              Scanning Executive & Commercial Corridors
            </span>
          </div>

          <div className="search-radar-airport search-radar-airport--dest">
            <span className="search-radar-city">{destCity}</span>
            <strong className="search-radar-code">{destination}</strong>
          </div>
        </div>

        <div className="search-live-radar__body">
          <div className="search-radar-status-head">
            <div className="search-radar-spinner" aria-hidden="true" />
            <div>
              <h3 className="search-radar-title">
                Retrieving Live Flight Availability
              </h3>
              <p className="search-radar-subtitle">
                Searching flights for <strong>{origin} → {destination}</strong> on <strong>{formattedDeparture}</strong> ({cabin})
              </p>
            </div>
          </div>

          <div className="search-radar-dynamic-box">
            <span className="search-radar-dynamic-dot" />
            <p className="search-radar-dynamic-msg" key={msgIdx}>
              {WAITING_MESSAGES[msgIdx]}
            </p>
          </div>

          <div className="search-radar-progress-bar" role="progressbar" aria-label="Searching live flights">
            <div className="search-radar-progress-fill" />
          </div>

          <div className="search-radar-badges">
            <span className="search-radar-pill">
              <Icon name="spark" size={13} />
              Live Google Flights Inventory
            </span>
            <span className="search-radar-pill">
              <Icon name="receipt" size={13} />
              18% GST Invoicing Included
            </span>
            <span className="search-radar-pill">
              <Icon name="badge" size={13} />
              Zero Hidden Surcharges
            </span>
          </div>
        </div>
      </div>

      {/* Shimmering Flight Cards Skeleton while waiting */}
      <div className="search-results-list" aria-label="Flight results loading">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flight-card flight-card--skeleton" aria-hidden="true">
            <div className="flight-card__airline">
              <div className="skeleton skeleton--square" />
              <div>
                <div className="skeleton skeleton--text skeleton--text-sm" />
                <div className="skeleton skeleton--text skeleton--text-xs" />
              </div>
            </div>
            <div className="flight-card__times">
              <div className="skeleton skeleton--text skeleton--text-lg" />
              <div className="flight-card__duration-line">
                <div className="skeleton skeleton--line" />
              </div>
              <div className="skeleton skeleton--text skeleton--text-lg" />
            </div>
            <div className="flight-card__price-block">
              <div className="skeleton skeleton--text skeleton--text-xs" />
              <div className="skeleton skeleton--text skeleton--text-price" />
              <div className="skeleton skeleton--btn" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="search-results-layout search-results-layout--loading">
      <div className="search-bar">
        <div className="search-bar__inner">
          <div className="skeleton skeleton--text skeleton--text-lg" style={{ width: 320 }} />
          <div className="skeleton skeleton--btn" style={{ width: 140 }} />
        </div>
      </div>
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 16 20-5-7-2-4-7-2 1 2 7-6 2-3-3-2 1 2 5Z" />
      <path d="M6 20h12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function SearchingIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  );
}
