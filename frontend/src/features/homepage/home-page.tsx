"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    // Scroll discovery observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-discovered");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -30px 0px",
      },
    );

    const elements = document.querySelectorAll(".scroll-discover");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

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
            Executive Aviation &amp; Premium Charters
          </span>
          <h1 id="hero-heading">Your Journey Begins Here</h1>
          <p>
            Discover scheduled commercial flights &amp; private corporate
            charters. Compare executive fares with guaranteed pricing and
            automated corporate GST reconciliation.
          </p>
          <div className="hero-points" aria-label="Platform features">
            <span>
              <Icon name="plane" size={18} />
              500+ Partner Airlines
            </span>
            <span>
              <Icon name="spark" size={18} />
              Real-Time Fare Tracker
            </span>
            <span>
              <Icon name="receipt" size={18} />
              Corporate GST Invoice Inbuilt
            </span>
            <span>
              <Icon name="badge" size={18} />
              IATA Accredited
            </span>
          </div>
        </div>

        {/* Airplane Master Showcase Banner */}
        <div className="hero-fleet-banner scroll-discover">
          <Image
            src="/images/hero-airplane.jpg"
            alt="SkyFare modern commercial airliner in flight"
            fill
            sizes="(max-width: 1200px) 100vw, 1160px"
            className="hero-fleet-banner__img"
            priority
          />
          <div className="hero-fleet-banner__overlay">
            <span className="hero-fleet-banner__tag">
              <Icon name="plane" size={14} />
              Commercial &amp; Executive Fleet
            </span>
            <span className="hero-fleet-banner__caption">
              Direct routes across 500+ commercial and private aviation corridors
            </span>
          </div>
        </div>

        <div id="search" className="search-anchor scroll-discover">
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
