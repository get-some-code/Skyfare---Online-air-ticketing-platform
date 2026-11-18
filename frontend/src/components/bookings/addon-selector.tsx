"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getAddonsApi } from "@/lib/api/bookings";
import type { AddonOption, AddonSelectionItem } from "@/lib/api/types";

interface AddonSelectorProps {
  passengers: Array<{ name: string }>;
  selectedAddons: AddonSelectionItem[];
  onChangeAddons: (addons: AddonSelectionItem[]) => void;
  currency?: "INR" | "USD";
}

export function AddonSelector({
  passengers,
  selectedAddons,
  onChangeAddons,
  currency = "INR",
}: AddonSelectorProps) {
  const [availableAddons, setAvailableAddons] = useState<AddonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePassengerIdx, setActivePassengerIdx] = useState(0);

  useEffect(() => {
    let ignore = false;
    getAddonsApi().then((items) => {
      if (!ignore) {
        setAvailableAddons(items);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  function isSelected(code: string): boolean {
    return selectedAddons.some(
      (a) => a.code === code && a.passenger_index === activePassengerIdx,
    );
  }

  function toggleAddon(option: AddonOption) {
    const existing = isSelected(option.code);
    const priceNum = currency === "INR" ? parseFloat(option.price_inr) : parseFloat(option.price_usd);

    if (existing) {
      // Remove
      onChangeAddons(
        selectedAddons.filter(
          (a) => !(a.code === option.code && a.passenger_index === activePassengerIdx),
        ),
      );
    } else {
      // Add
      onChangeAddons([
        ...selectedAddons,
        {
          passenger_index: activePassengerIdx,
          category: option.category,
          code: option.code,
          title: option.title,
          price: priceNum,
        },
      ]);
    }
  }

  if (loading) {
    return (
      <div className="addon-loading">
        <div className="spinner" />
        <p>Loading flight add-on services...</p>
      </div>
    );
  }

  // Filter categories
  const baggageOptions = availableAddons.filter((a) => a.category === "baggage");
  const mealOptions = availableAddons.filter((a) => a.category === "meal");
  const serviceOptions = availableAddons.filter((a) => ["priority", "assistance"].includes(a.category));

  return (
    <div className="addon-selector-container">
      {/* Passenger Tabs */}
      {passengers.length > 1 && (
        <div className="addon-passenger-tabs">
          <span className="addon-passenger-tabs__title">Select Add-ons For:</span>
          <div className="addon-passenger-tabs__list">
            {passengers.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className={`addon-passenger-btn ${idx === activePassengerIdx ? "is-active" : ""}`}
                onClick={() => setActivePassengerIdx(idx)}
              >
                <Icon name="user" size={14} />
                <span>{p.name || `Passenger ${idx + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Baggage Section */}
      <div className="addon-section">
        <div className="addon-section__header">
          <Icon name="luggage" size={20} className="addon-section__icon" />
          <div>
            <h4>Additional Checked Baggage</h4>
            <p>Standard fare includes 15 kg checked baggage. Add more at discounted web rates.</p>
          </div>
        </div>
        <div className="addon-grid">
          {baggageOptions.map((opt) => {
            const active = isSelected(opt.code);
            const price = currency === "INR" ? `₹${parseFloat(opt.price_inr).toLocaleString()}` : `$${opt.price_usd}`;
            return (
              <div
                key={opt.code}
                className={`addon-card ${active ? "is-selected" : ""}`}
                onClick={() => toggleAddon(opt)}
              >
                <div className="addon-card__content">
                  <div className="addon-card__top">
                    <strong>{opt.title}</strong>
                    <span className="addon-card__price">{price}</span>
                  </div>
                  <p>{opt.description}</p>
                </div>
                <button
                  type="button"
                  className={`addon-card__button ${active ? "is-selected" : ""}`}
                  aria-pressed={active}
                >
                  <Icon name={active ? "check" : "plus"} size={14} />
                  <span>{active ? "Added" : "Add"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* In-Flight Meals */}
      <div className="addon-section">
        <div className="addon-section__header">
          <Icon name="utensils" size={20} className="addon-section__icon" />
          <div>
            <h4>In-flight Gourmet Meals</h4>
            <p>Hot, chef-curated meals prepared fresh and served at 35,000 feet.</p>
          </div>
        </div>
        <div className="addon-grid">
          {mealOptions.map((opt) => {
            const active = isSelected(opt.code);
            const price = currency === "INR" ? `₹${parseFloat(opt.price_inr).toLocaleString()}` : `$${opt.price_usd}`;
            return (
              <div
                key={opt.code}
                className={`addon-card ${active ? "is-selected" : ""}`}
                onClick={() => toggleAddon(opt)}
              >
                <div className="addon-card__content">
                  <div className="addon-card__top">
                    <strong>{opt.title}</strong>
                    <span className="addon-card__price">{price}</span>
                  </div>
                  <p>{opt.description}</p>
                </div>
                <button
                  type="button"
                  className={`addon-card__button ${active ? "is-selected" : ""}`}
                  aria-pressed={active}
                >
                  <Icon name={active ? "check" : "plus"} size={14} />
                  <span>{active ? "Added" : "Add"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority & Special Services */}
      <div className="addon-section">
        <div className="addon-section__header">
          <Icon name="zap" size={20} className="addon-section__icon" />
          <div>
            <h4>Priority Services &amp; Airport Assistance</h4>
            <p>Skip check-in queues or request complimentary wheelchair assistance.</p>
          </div>
        </div>
        <div className="addon-grid">
          {serviceOptions.map((opt) => {
            const active = isSelected(opt.code);
            const price = parseFloat(opt.price_inr) === 0 ? "Complimentary" : currency === "INR" ? `₹${parseFloat(opt.price_inr).toLocaleString()}` : `$${opt.price_usd}`;
            return (
              <div
                key={opt.code}
                className={`addon-card ${active ? "is-selected" : ""}`}
                onClick={() => toggleAddon(opt)}
              >
                <div className="addon-card__content">
                  <div className="addon-card__top">
                    <strong>{opt.title}</strong>
                    <span className="addon-card__price">{price}</span>
                  </div>
                  <p>{opt.description}</p>
                </div>
                <button
                  type="button"
                  className={`addon-card__button ${active ? "is-selected" : ""}`}
                  aria-pressed={active}
                >
                  <Icon name={active ? "check" : "plus"} size={14} />
                  <span>{active ? "Added" : "Add"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
