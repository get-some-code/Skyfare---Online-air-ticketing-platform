"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

const PLANNING_STEPS = [
  {
    step: 1,
    title: "Locating Gateway Airports",
    desc: "Analyzing arrival airports, runways, and onward transit corridors...",
  },
  {
    step: 2,
    title: "Mapping Scenic Corridors",
    desc: "Verifying scenic mountain passes, tunnels, and high-elevation checkpoints...",
  },
  {
    step: 3,
    title: "Architecting Daily Itinerary",
    desc: "Curating authentic viewpoints, heritage temples, and non-repeating stops...",
  },
  {
    step: 4,
    title: "Vetting Dining & Food",
    desc: "Selecting verified restaurants with pure vegetarian and local specialties...",
  },
  {
    step: 5,
    title: "Calculating Itemized Budget",
    desc: "Summing local transport, stays, entry passes, and approximate flight fares in INR...",
  },
  {
    step: 6,
    title: "Finalizing Traveller Blueprint",
    desc: "Compiling permits, currency advisories, and SIM connectivity for Indian travellers...",
  },
];

export function PlannerLoading({ destination }: { destination: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLANNING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const current = PLANNING_STEPS[index];
  const progressPercent = Math.min(95, Math.round(((index + 1) / PLANNING_STEPS.length) * 100));

  return (
    <div className="planner-loading-card" role="status" aria-live="polite">
      <div className="planner-loading-card__spinner-wrap">
        <div className="planner-loading-card__orbit" />
        <span className="planner-loading-card__center-icon">
          <Icon name="spark" size={28} />
        </span>
      </div>

      <div className="planner-loading-card__content">
        <div className="planner-loading-badge">
          Step {current.step} of {PLANNING_STEPS.length}: {current.title}
        </div>
        <h3>Building your plan for {destination}</h3>
        <p className="planner-loading-card__status" key={index}>
          {current.desc}
        </p>

        {/* Dynamic Animated Progress Indicator */}
        <div className="planner-loading-progress-wrap" aria-hidden="true">
          <div className="planner-loading-progress-bar" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Shimmer Skeletons */}
      <div className="planner-skeleton-grid" aria-hidden="true">
        <div className="planner-skeleton-block planner-skeleton-block--banner" />
        <div className="planner-skeleton-block planner-skeleton-block--card" />
        <div className="planner-skeleton-block planner-skeleton-block--card" />
        <div className="planner-skeleton-block planner-skeleton-block--table" />
      </div>
    </div>
  );
}
