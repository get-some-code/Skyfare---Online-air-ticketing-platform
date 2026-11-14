"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";

const EXAMPLE_DESTINATIONS = [
  "Manali",
  "Germany",
  "Leh Ladakh",
  "Switzerland",
  "Goa",
  "Dubai",
];

export function PlannerTeaserSection() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [destination, setDestination] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % EXAMPLE_DESTINATIONS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  function handleNavigate(dest: string) {
    const trimmed = dest.trim();
    if (!trimmed) return;
    const targetUrl = `/planner?destination=${encodeURIComponent(trimmed)}`;
    if (isAuthenticated) {
      router.push(targetUrl);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleNavigate(destination || EXAMPLE_DESTINATIONS[placeholderIndex]);
  }

  return (
    <section className="planner-teaser scroll-discover" aria-labelledby="planner-teaser-heading">
      <div className="planner-teaser__inner">
        <div className="planner-teaser__copy">
          <h2 id="planner-teaser-heading">AI Trip Planner</h2>
          <p>
            Get a tailored day-by-day itinerary, optimal arrival airports, and an itemized budget in INR.
          </p>
        </div>

        <form className="planner-teaser__form" onSubmit={handleSubmit}>
          <div className="planner-teaser__input-wrap">
            <span className="planner-teaser__search-icon" aria-hidden="true">
              <Icon name="search" size={20} />
            </span>
            <input
              type="text"
              className="planner-teaser__input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={`Where do you want to go? e.g. ${EXAMPLE_DESTINATIONS[placeholderIndex]}`}
              aria-label="Destination to plan a trip"
            />
            <button type="submit" className="button button--primary planner-teaser__submit">
              Plan My Trip
              <Icon name="arrow-right" size={16} />
            </button>
          </div>

          <div className="planner-teaser__chips" aria-label="Suggested destinations">
            <span className="planner-teaser__chips-label">Popular:</span>
            {EXAMPLE_DESTINATIONS.map((dest) => (
              <button
                key={dest}
                type="button"
                className="planner-teaser__chip"
                onClick={() => handleNavigate(dest)}
              >
                {dest}
              </button>
            ))}
          </div>

          {!isAuthenticated && (
            <span className="planner-teaser__auth-note">
              Free SkyFare account required to generate and view full itineraries.
            </span>
          )}
        </form>
      </div>
    </section>
  );
}
