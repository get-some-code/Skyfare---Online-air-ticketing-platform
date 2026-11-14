"use client";

import React, { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

export interface Offer {
  id: string;
  category: "all" | "bank" | "first-time" | "corporate" | "seasonal";
  badge: string;
  badgeType: "gold" | "blue" | "emerald" | "purple";
  title: string;
  discount: string;
  description: string;
  code: string;
  validity: string;
}

const OFFERS: Offer[] = [
  {
    id: "hdfc-luxe",
    category: "bank",
    badge: "HDFC Bank Infinia & Regalia",
    badgeType: "gold",
    title: "15% Instant Savings on Executive Flights",
    discount: "FLAT 15% OFF",
    description: "Applicable on Business & First Class domestic and international flights. Plus earn 5X Reward Points.",
    code: "HDFCLUXE",
    validity: "Valid till 31 Dec 2026 · Min. booking ₹12,000",
  },
  {
    id: "sky-first",
    category: "first-time",
    badge: "First Time Flyer Welcome",
    badgeType: "blue",
    title: "Welcome to SkyFare Privilege",
    discount: "FLAT ₹2,500 / $35 OFF",
    description: "Instant discount on your maiden executive flight reservation across all 500+ commercial airline routes.",
    code: "SKYFIRST",
    validity: "Valid for new accounts · No minimum spend required",
  },
  {
    id: "amex-privilege",
    category: "bank",
    badge: "American Express Centurion & Platinum",
    badgeType: "gold",
    title: "Complimentary VIP Lounge + Instant Fare Cut",
    discount: "UP TO ₹5,000 / $60 OFF",
    description: "Exclusive luxury discount on international charters and long-haul flights + airport terminal concierge access.",
    code: "AMEXPLUX",
    validity: "Valid on Amex cards · Instant checkout credit",
  },
  {
    id: "corp-tax",
    category: "corporate",
    badge: "Corporate Advantage & GST Reconciliation",
    badgeType: "purple",
    title: "Automated GST Invoices & Zero Fee Changes",
    discount: "SAVE 18% GST ITC",
    description: "Claim full 18% Input Tax Credit with automated corporate GSTIN billing plus free date change up to 24h before departure.",
    code: "CORPPRO",
    validity: "For verified corporate profiles & business bookings",
  },
  {
    id: "icici-emerale",
    category: "bank",
    badge: "ICICI Bank Emeralde & Sapphiro",
    badgeType: "emerald",
    title: "12% Instant Fare Deduction + Free Inflight Dining",
    discount: "FLAT 12% OFF",
    description: "Instant savings on scheduled flights across India and Middle East corridors with complimentary seat selection.",
    code: "ICICIFLIGHT",
    validity: "Valid on ICICI credit cards · Twice per card",
  },
  {
    id: "seasonal-escape",
    category: "seasonal",
    badge: "Seasonal Coastal & Island Charters",
    badgeType: "blue",
    title: "Round-Trip Retreats to Goa, Dubai & Maldives",
    discount: "FLAT 10% OFF",
    description: "Special chartered flight rates on executive coastal routes and luxury holiday packages.",
    code: "ESCAPE10",
    validity: "Limited seasonal availability · Applicable on round-trips",
  },
];

export function OffersSection() {
  const [activeCategory, setActiveCategory] = useState<"all" | "bank" | "first-time" | "corporate">("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const filteredOffers = activeCategory === "all"
    ? OFFERS
    : OFFERS.filter((o) => o.category === activeCategory || (activeCategory === "bank" && o.category === "bank"));

  // Auto-advance slides
  useEffect(() => {
    if (isPaused || filteredOffers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % filteredOffers.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, filteredOffers.length]);

  function handleCopyCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  }

  function handleApplyOffer(code: string) {
    handleCopyCode(code);
    const searchEl = document.getElementById("search");
    if (searchEl) {
      searchEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handlePrev() {
    setCurrentSlide((prev) => (prev - 1 + filteredOffers.length) % filteredOffers.length);
  }

  function handleNext() {
    setCurrentSlide((prev) => (prev + 1) % filteredOffers.length);
  }

  return (
    <section
      id="offers"
      className="offers-section scroll-discover"
      aria-labelledby="offers-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="offers-section__header">
        <div className="offers-section__title-group">
          <h2 id="offers-heading">Promotions &amp; Bank Partnerships</h2>
          <p>
            Curated partner discounts, corporate tax benefits, and first-time flyer credits updated in real-time.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="offers-filter-pills" role="tablist" aria-label="Offer categories">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "all"}
            className={`offer-filter-pill${activeCategory === "all" ? " is-active" : ""}`}
            onClick={() => {
              setActiveCategory("all");
              setCurrentSlide(0);
            }}
          >
            All Privileges
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "bank"}
            className={`offer-filter-pill${activeCategory === "bank" ? " is-active" : ""}`}
            onClick={() => {
              setActiveCategory("bank");
              setCurrentSlide(0);
            }}
          >
            Bank Offers
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "first-time"}
            className={`offer-filter-pill${activeCategory === "first-time" ? " is-active" : ""}`}
            onClick={() => {
              setActiveCategory("first-time");
              setCurrentSlide(0);
            }}
          >
            First-Time Flyer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "corporate"}
            className={`offer-filter-pill${activeCategory === "corporate" ? " is-active" : ""}`}
            onClick={() => {
              setActiveCategory("corporate");
              setCurrentSlide(0);
            }}
          >
            Corporate &amp; GST
          </button>
        </div>
      </div>

      {/* Main Dynamic Offers Carousel */}
      <div className="offers-carousel">
        <div className="offers-carousel__track">
          {filteredOffers.map((offer, idx) => {
            const isCurrent = idx === currentSlide;
            return (
              <div
                key={offer.id}
                className={`offer-card offer-card--${offer.badgeType}${isCurrent ? " is-active" : ""}`}
                aria-hidden={!isCurrent}
              >
                <div className="offer-card__top">
                  <span className={`offer-badge offer-badge--${offer.badgeType}`}>
                    <Icon name="spark" size={13} />
                    {offer.badge}
                  </span>
                  <span className="offer-discount-tag">{offer.discount}</span>
                </div>

                <h3 className="offer-card__title">{offer.title}</h3>
                <p className="offer-card__desc">{offer.description}</p>

                <div className="offer-card__footer">
                  <div className="offer-code-box">
                    <span className="offer-code-label">PROMO CODE</span>
                    <strong className="offer-code-val">{offer.code}</strong>
                  </div>

                  <div className="offer-actions">
                    <button
                      type="button"
                      className="button button--small button--secondary offer-copy-btn"
                      onClick={() => handleCopyCode(offer.code)}
                      aria-label={`Copy code ${offer.code}`}
                    >
                      {copiedCode === offer.code ? "Copied! ✨" : "Copy Code"}
                    </button>
                    <button
                      type="button"
                      className="button button--small button--primary offer-apply-btn"
                      onClick={() => handleApplyOffer(offer.code)}
                    >
                      Book With Offer
                    </button>
                  </div>
                </div>

                <div className="offer-card__validity">
                  <Icon name="plane" size={13} />
                  <span>{offer.validity}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation & Indicators */}
        <div className="offers-carousel__controls">
          <div className="offers-carousel__dots">
            {filteredOffers.map((offer, idx) => (
              <button
                key={offer.id}
                type="button"
                className={`offers-dot${idx === currentSlide ? " is-active" : ""}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to offer ${idx + 1}`}
              />
            ))}
          </div>

          <div className="offers-carousel__arrows">
            <button
              type="button"
              className="fleet-nav-btn"
              onClick={handlePrev}
              aria-label="Previous promotional offer"
            >
              ‹
            </button>
            <button
              type="button"
              className="fleet-nav-btn"
              onClick={handleNext}
              aria-label="Next promotional offer"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
