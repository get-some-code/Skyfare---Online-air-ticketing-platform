"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

const STATUS_MESSAGES = [
  "Finding the best arrival airport and transit corridors...",
  "Mapping optimal routes, tunnels, and scenic mountain passes...",
  "Curating verified local restaurants and vegetarian dining...",
  "Calculating 3-tier budget estimates in INR...",
  "Compiling Indian traveller advisories, permits, and connectivity...",
  "Finalizing your bespoke flight and journey blueprint...",
];

export function PlannerLoading({ destination }: { destination: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="planner-loading-card" role="status" aria-live="polite">
      <div className="planner-loading-card__spinner-wrap">
        <div className="planner-loading-card__orbit" />
        <span className="planner-loading-card__center-icon">
          <Icon name="spark" size={28} />
        </span>
      </div>

      <div className="planner-loading-card__content">
        <h3>Building your plan for {destination}</h3>
        <p className="planner-loading-card__status" key={index}>
          {STATUS_MESSAGES[index]}
        </p>
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
