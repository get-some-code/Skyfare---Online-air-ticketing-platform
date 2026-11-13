"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

interface FleetSlide {
  src: string;
  title: string;
  caption: string;
  category: string;
  tag: string;
}

const FLEET_SLIDES: FleetSlide[] = [
  {
    src: "/images/hero-airplane.jpg",
    title: "Commercial & Executive Fleet",
    caption: "Direct scheduled flights and premier corridors across 500+ global partner airlines",
    category: "Commercial Jet",
    tag: "A350 & 787 Dreamliner",
  },
  {
    src: "/images/fleet-first-class.jpg",
    title: "SkyFare Signature First Class Suite",
    caption: "Enclosed private suites, lie-flat quilted leather beds, ambient mood lighting & champagne service",
    category: "First Class Suite",
    tag: "Ultra-Luxury Suite",
  },
  {
    src: "/images/fleet-private-jet.jpg",
    title: "Executive Corporate Jet Charters",
    caption: "Handcrafted mahogany conference saloons, bespoke private catering & discreet VIP terminal boarding",
    category: "Private Jet Cabin",
    tag: "Corporate Charter",
  },
  {
    src: "/images/fleet-exterior-sunset.jpg",
    title: "Cruising Above The Horizon",
    caption: "Twin-engine widebody elegance soaring effortlessly above golden sunset cloud formations",
    category: "Golden Sunset",
    tag: "Cruising 38,000 FT",
  },
  {
    src: "/images/fleet-cockpit.jpg",
    title: "State-of-the-Art Glass Avionics",
    caption: "Triple-redundant fly-by-wire flight deck and precision satellite meteorological navigation",
    category: "Flight Deck",
    tag: "Next-Gen Avionics",
  },
];

export function FleetShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FLEET_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentSlide = FLEET_SLIDES[currentIndex];

  function handlePrev() {
    setCurrentIndex((prev) => (prev - 1 + FLEET_SLIDES.length) % FLEET_SLIDES.length);
  }

  function handleNext() {
    setCurrentIndex((prev) => (prev + 1) % FLEET_SLIDES.length);
  }

  return (
    <div
      className="hero-fleet-banner scroll-discover"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      role="region"
      aria-label="Fleet and cabin interior showcase"
    >
      {/* Background Slides */}
      {FLEET_SLIDES.map((slide, idx) => (
        <div
          key={slide.src}
          className={`hero-fleet-banner__slide${idx === currentIndex ? " is-active" : ""}`}
          aria-hidden={idx !== currentIndex}
        >
          <Image
            src={slide.src}
            alt={slide.title}
            fill
            sizes="(max-width: 1200px) 100vw, 1160px"
            className="hero-fleet-banner__img"
            priority={idx === 0}
          />
        </div>
      ))}

      {/* Floating Info Overlay */}
      <div className="hero-fleet-banner__overlay">
        <div className="hero-fleet-banner__meta">
          <span className="hero-fleet-banner__tag">
            <Icon name="plane" size={14} />
            {currentSlide.tag}
          </span>
          <span className="hero-fleet-banner__count">
            {currentIndex + 1} / {FLEET_SLIDES.length}
          </span>
        </div>

        <h3 className="hero-fleet-banner__heading">{currentSlide.title}</h3>
        <span className="hero-fleet-banner__caption">{currentSlide.caption}</span>

        {/* Thumbnail Navigation Pills */}
        <div className="hero-fleet-banner__controls">
          <div className="hero-fleet-banner__pills">
            {FLEET_SLIDES.map((slide, idx) => (
              <button
                key={slide.category}
                type="button"
                className={`fleet-pill${idx === currentIndex ? " is-active" : ""}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`View ${slide.category}`}
              >
                {slide.category}
              </button>
            ))}
          </div>

          <div className="hero-fleet-banner__nav-arrows">
            <button
              type="button"
              className="fleet-nav-btn"
              onClick={handlePrev}
              aria-label="Previous aircraft slide"
            >
              ‹
            </button>
            <button
              type="button"
              className="fleet-nav-btn"
              onClick={handleNext}
              aria-label="Next aircraft slide"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
