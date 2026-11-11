"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { BenefitsSection } from "@/features/homepage/components/benefits-section";
import { DestinationsSection } from "@/features/homepage/components/destinations-section";
import { FlightSearchForm } from "@/features/homepage/components/flight-search-form";
import { MembershipSection } from "@/features/homepage/components/membership-section";
import { airports } from "@/features/homepage/data/homepage-fixtures";

export function HomePage() {
  const [selectedDestination, setSelectedDestination] =
    useState("DXB - Dubai");
  const [routeNotice, setRouteNotice] = useState("");

  function chooseDestination(code: string) {
    const airport = airports.find((item) => item.code === code);
    if (!airport) {
      throw new Error(`Unknown destination fixture: ${code}`);
    }

    setSelectedDestination(`${airport.code} - ${airport.city}`);
    setRouteNotice(
      `${airport.city} selected as your destination. Choose travel dates to continue.`,
    );
    document.getElementById("search")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <main id="top">
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-section__ornament" aria-hidden="true" />
        <div className="hero-section__intro">
          <span className="hero-kicker">
            <Icon name="plane" size={17} />
            Executive aviation &amp; premium charters
          </span>
          <h1 id="hero-heading">Your Journey Begins Here</h1>
          <p>
            Discover a considered way to plan commercial and corporate travel.
            This preview demonstrates the SkyFare experience — it does not
            connect to live flight availability.
          </p>
          <div className="hero-points" aria-label="Preview features">
            <span>
              <Icon name="plane" size={18} />
              Route examples
            </span>
            <span>
              <Icon name="spark" size={18} />
              Booking flow preview
            </span>
            <span>
              <Icon name="receipt" size={18} />
              Business travel concepts
            </span>
            <span>
              <Icon name="shield" size={18} />
              No live transactions
            </span>
          </div>
        </div>

        <div id="search" className="search-anchor">
          <FlightSearchForm
            selectedDestination={selectedDestination}
            onDestinationChange={(value) => {
              setSelectedDestination(value);
              setRouteNotice("");
            }}
          />
          {routeNotice && (
            <p className="route-notice" role="status">
              {routeNotice}
            </p>
          )}
        </div>
      </section>

      <DestinationsSection onChooseDestination={chooseDestination} />
      <BenefitsSection />
      <MembershipSection />
    </main>
  );
}
