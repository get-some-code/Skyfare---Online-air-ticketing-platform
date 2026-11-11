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
  }>;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <main className="search-preview-page">
      <Suspense
        fallback={
          <section className="search-preview-card" aria-live="polite">
            Loading your search details…
          </section>
        }
      >
        <SearchDetails searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchDetails({ searchParams }: SearchPageProps) {
  const params = await searchParams;

  return (
    <section className="search-preview-card" aria-labelledby="search-title">
      <span className="eyebrow eyebrow--blue">Search preview</span>
      <h1 id="search-title">Your search details</h1>
      <p className="search-preview-card__lead">
        Your criteria were captured for this preview. Live flights, fares, and
        availability are not connected, so no results are shown.
      </p>
      <dl className="search-summary">
        <div>
          <dt>Route</dt>
          <dd>
            {params.origin || "—"} → {params.destination || "—"}
          </dd>
        </div>
        <div>
          <dt>Trip type</dt>
          <dd>{params.tripType || "—"}</dd>
        </div>
        <div>
          <dt>Departure</dt>
          <dd>{params.departure || "—"}</dd>
        </div>
        {params.return && (
          <div>
            <dt>Return</dt>
            <dd>{params.return}</dd>
          </div>
        )}
        <div>
          <dt>Travellers &amp; cabin</dt>
          <dd>
            {params.travellers || "—"} · {params.cabin || "—"}
          </dd>
        </div>
      </dl>
      <div className="search-preview-card__notice" role="status">
        <IconForSearchPreview />
        No live flight search has been performed.
      </div>
      <Link href="/#search" className="button button--primary">
        Back to search
      </Link>
    </section>
  );
}

function IconForSearchPreview() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4m0 4h.01" />
    </svg>
  );
}
