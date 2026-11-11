"use client";

import { useMemo, useState } from "react";

import { useCurrency } from "@/components/site/currency-context";
import { Icon } from "@/components/ui/icon";
import {
  destinationCategories,
  destinations,
} from "@/features/homepage/data/homepage-fixtures";

interface DestinationsSectionProps {
  onChooseDestination: (code: string) => void;
}

type CategoryFilter = (typeof destinationCategories)[number];

export function DestinationsSection({
  onChooseDestination,
}: DestinationsSectionProps) {
  const [category, setCategory] = useState<CategoryFilter>("All Routes");
  const { formatPrice } = useCurrency();

  const visibleDestinations = useMemo(
    () =>
      category === "All Routes"
        ? destinations
        : destinations.filter(
            (destination) => destination.category === category,
          ),
    [category],
  );

  return (
    <section
      id="destinations"
      className="section destinations-section"
      aria-labelledby="destinations-heading"
    >
      <div className="section-heading section-heading--row">
        <div>
          <span className="eyebrow eyebrow--blue">
            <Icon name="compass" size={16} />
            Curated getaways
          </span>
          <h2 id="destinations-heading">Popular Destinations</h2>
          <p>
            Hand-picked routes and travel ideas for your next journey.
          </p>
        </div>
        <div className="destination-filters" aria-label="Filter destinations">
          {destinationCategories.map((item) => (
            <button
              key={item}
              type="button"
              className={`filter-pill${category === item ? " is-active" : ""}`}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className="data-disclosure" role="note">
        Example destinations and fares are development fixtures, not live routes
        or available prices.
      </p>

      <div className="destination-grid">
        {visibleDestinations.map((destination) => (
          <article className="destination-card" key={destination.code}>
            <div
              className={`destination-card__visual destination-card__visual--${destination.code.toLowerCase()}`}
            >
              <span className="destination-card__code">
                IATA: {destination.code}
              </span>
              {destination.tag && (
                <span className="destination-card__tag">{destination.tag}</span>
              )}
              <div className="destination-card__title">
                <h3>{destination.city}</h3>
                <p>{destination.subtitle}</p>
              </div>
            </div>
            <div className="destination-card__details">
              <div>
                <span className="destination-card__caption">
                  Illustrative fare
                </span>
                <strong>
                  {formatPrice(destination.fareInr, destination.fareUsd)}
                </strong>
              </div>
              <button
                className="button button--destination"
                type="button"
                onClick={() => onChooseDestination(destination.code)}
                aria-label={`Use ${destination.city} as the destination`}
              >
                Choose route
                <Icon name="arrow-right" size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
