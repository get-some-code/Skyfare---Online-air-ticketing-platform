"use client";

import Image from "next/image";
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
      <div className="section-heading section-heading--row scroll-discover">
        <div className="section-heading__copy">
          <span className="eyebrow eyebrow--blue">
            <Icon name="compass" size={16} />
            Curated Getaways
          </span>
          <h2 id="destinations-heading">Popular Destinations</h2>
          <p>
            Hand-picked premium routes and corporate corridors with privileged
            pricing.
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

      <div className="destination-grid">
        {visibleDestinations.map((destination, index) => (
          <article
            className={`destination-card scroll-discover scroll-discover--stagger-${(index % 6) + 1} is-discovered`}
            key={destination.code}
          >
            <div className="destination-card__visual">
              <Image
                src={destination.image}
                alt={destination.city}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="destination-card__photo"
              />
              <div className="destination-card__overlay" aria-hidden="true" />
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
                  Fares starting from
                </span>
                <strong className="destination-card__fare">
                  {formatPrice(destination.fareInr, destination.fareUsd)}
                  <span className="destination-card__fare-alt">
                    {" "}
                    /{" "}
                    {destination.fareUsd < 1000
                      ? `$${destination.fareUsd}`
                      : `$${destination.fareUsd.toLocaleString()}`}
                  </span>
                </strong>
              </div>
              <button
                className="button button--destination"
                type="button"
                onClick={() => onChooseDestination(destination.code)}
                aria-label={`Book a flight to ${destination.city}`}
              >
                Book Now
                <Icon name="arrow-right" size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
