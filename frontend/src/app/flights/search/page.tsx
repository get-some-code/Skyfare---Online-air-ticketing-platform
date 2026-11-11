import Link from "next/link";
import { Suspense } from "react";

interface SearchPageProps {
  searchParams: Promise<{
    tripType?: string;
    origin?: string;
    destination?: string;
    departure?: string;
    return?: string;
    travellers?: string;
    cabin?: string;
    directOnly?: string;
  }>;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <main className="search-results-page">
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResultsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchResultsContent({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  const origin = params.origin ?? "—";
  const destination = params.destination ?? "—";
  const departure = params.departure ?? "";
  const returnDate = params.return ?? "";
  const travellers = params.travellers ?? "1";
  const cabin = params.cabin ?? "Economy";
  const tripType = params.tripType ?? "round-trip";
  const directOnly = params.directOnly === "true";

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

  return (
    <>
      {/* Search header bar */}
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
                {travellers} {Number(travellers) === 1 ? "Adult" : "Adults"}
                {" · "}
                {cabin}
                {directOnly ? " · Direct only" : ""}
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
        {/* Sidebar filters (skeleton) */}
        <aside className="search-filters" aria-label="Refine results">
          <div className="search-filters__header">
            <FilterIcon />
            <span>Refine Results</span>
            <button type="button" className="text-button search-filters__reset">
              Reset all
            </button>
          </div>

          <div className="search-filters__group">
            <h3>Stops</h3>
            <label className="check-option">
              <input type="checkbox" defaultChecked={directOnly} readOnly />
              <span>Non-stop (Direct)</span>
            </label>
            <label className="check-option">
              <input type="checkbox" readOnly />
              <span>1 Stop</span>
            </label>
            <label className="check-option">
              <input type="checkbox" readOnly />
              <span>2+ Stops</span>
            </label>
          </div>

          <div className="search-filters__group">
            <h3>Cabin Class</h3>
            {["Economy", "Premium Economy", "Business / Flexi", "First Class"].map(
              (cls) => (
                <label key={cls} className="check-option">
                  <input
                    type="checkbox"
                    defaultChecked={cabin === cls}
                    readOnly
                  />
                  <span>{cls}</span>
                </label>
              ),
            )}
          </div>

          <div className="search-filters__group">
            <h3>Departure Time</h3>
            {["Early Morning", "Morning", "Afternoon", "Evening"].map((time) => (
              <label key={time} className="check-option">
                <input type="checkbox" readOnly />
                <span>{time}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Main results area */}
        <section className="search-results-main" aria-labelledby="results-heading">
          <div className="search-results-toolbar">
            <div className="search-results-toolbar__count">
              <span className="search-results-toolbar__badge">
                <SearchingIcon />
                Searching availability…
              </span>
            </div>
            <div className="search-results-toolbar__sort" role="group" aria-label="Sort results">
              {["Cheapest", "Fastest", "Best Value", "Departure"].map((sort) => (
                <button
                  key={sort}
                  type="button"
                  className={`sort-tab${sort === "Cheapest" ? " is-active" : ""}`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>

          {/* Flight result skeleton cards */}
          <div className="search-results-list" aria-label="Flight results loading">
            {[1, 2, 3, 4].map((n) => (
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

          {/* Connection notice — not a dev banner, just UX state info */}
          <div className="search-results-notice" role="status">
            <InfoIcon />
            <div>
              <strong>Live flight inventory is being connected</strong>
              <p>
                Real-time fares, seat availability, and airline data will appear
                here once the backend service is ready. Your search criteria —{" "}
                <strong>
                  {origin} → {destination}
                </strong>{" "}
                on {formattedDeparture} — has been captured.
              </p>
              <Link href="/#search" className="button button--primary button--small">
                Search another route
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
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

/* Inline SVG icons to avoid adding a dependency */
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
