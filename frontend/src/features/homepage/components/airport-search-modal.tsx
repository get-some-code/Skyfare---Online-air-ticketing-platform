"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import {
  AirportItem,
  searchAirports,
} from "../data/airports-catalog";

interface AirportSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (airport: AirportItem) => void;
  title: string;
  currentCode?: string;
}

const REGION_TABS = [
  { id: "Popular", label: "⭐ Popular" },
  { id: "India", label: "🇮🇳 India" },
  { id: "Europe", label: "🌍 Europe" },
  { id: "Middle East", label: "🌴 Middle East" },
  { id: "Asia & Pacific", label: "🌏 Asia-Pacific" },
  { id: "Americas", label: "🌎 Americas" },
  { id: "All", label: "All Airports" },
];

export function AirportSearchModal(props: AirportSearchModalProps) {
  if (!props.isOpen) return null;
  return <AirportSearchModalContent {...props} />;
}

function AirportSearchModalContent({
  onClose,
  onSelect,
  title,
  currentCode,
}: AirportSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Popular");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredAirports = useMemo(() => {
    return searchAirports(query, query.trim() ? undefined : activeTab);
  }, [query, activeTab]);

  return (
    <div
      className="airport-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="airport-modal-sheet">
        {/* Mobile Pull Handle */}
        <div className="airport-modal-handle-bar" aria-hidden="true">
          <div className="airport-modal-handle" />
        </div>

        {/* Modal Header */}
        <div className="airport-modal-header">
          <div className="airport-modal-title-row">
            <div className="airport-modal-title-wrap">
              <span className="airport-modal-badge">
                <Icon name="plane" size={13} />
                Global Airport Directory
              </span>
              <h2 className="airport-modal-title">{title}</h2>
            </div>
            <button
              type="button"
              className="airport-modal-close-btn"
              onClick={onClose}
              aria-label="Close airport search"
            >
              <Icon name="x" size={20} />
            </button>
          </div>

          {/* Search Input Box */}
          <div className="airport-search-input-wrap">
            <Icon name="search" size={18} className="airport-search-icon" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search place, city, country, or code (e.g. Dubai, London, JFK, Tokyo)..."
              className="airport-search-input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="airport-search-clear-btn"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Region Tabs (shown when not actively typing search query) */}
          {!query.trim() && (
            <div className="airport-modal-tabs" role="tablist" aria-label="Airport regions">
              {REGION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`airport-tab-pill${activeTab === tab.id ? " is-active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Result Summary */}
          {query.trim() && (
            <div className="airport-results-counter">
              <span>
                Found <strong>{filteredAirports.length}</strong> matching airport
                {filteredAirports.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
              </span>
            </div>
          )}
        </div>

        {/* Airport Results List */}
        <div ref={listRef} className="airport-modal-list" tabIndex={-1}>
          {filteredAirports.length === 0 ? (
            <div className="airport-list-empty">
              <Icon name="plane" size={32} />
              <p className="airport-empty-title">No airports found for &ldquo;{query}&rdquo;</p>
              <p className="airport-empty-sub">
                Try searching by country (e.g. &ldquo;Japan&rdquo;, &ldquo;France&rdquo;), city, or 3-letter IATA code.
              </p>
              <button
                type="button"
                className="airport-reset-btn"
                onClick={() => setQuery("")}
              >
                Browse Popular Global Airports
              </button>
            </div>
          ) : (
            filteredAirports.map((airport) => {
              const isSelected =
                currentCode &&
                airport.code.toUpperCase() === currentCode.toUpperCase();
              return (
                <button
                  key={airport.code}
                  type="button"
                  className={`airport-item-row${isSelected ? " is-selected" : ""}`}
                  onClick={() => {
                    onSelect(airport);
                    onClose();
                  }}
                >
                  <div className="airport-code-badge">
                    <span className="airport-iata-code">{airport.code}</span>
                    <span className="airport-country-pill">{airport.countryCode}</span>
                  </div>

                  <div className="airport-details-col">
                    <div className="airport-city-line">
                      <strong className="airport-city-name">{airport.city}</strong>
                      <span className="airport-country-name">, {airport.country}</span>
                    </div>
                    <div className="airport-name-line">{airport.airport}</div>
                    {airport.terminals && (
                      <div className="airport-terminals-tag">{airport.terminals}</div>
                    )}
                  </div>

                  <div className="airport-action-col">
                    <span className="airport-region-badge">{airport.region}</span>
                    {isSelected ? (
                      <span className="airport-check-icon" title="Currently selected">
                        ✓
                      </span>
                    ) : (
                      <span className="airport-arrow-icon" aria-hidden="true">
                        →
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="airport-modal-footer">
          <span>
            <Icon name="spark" size={13} />
            Showing major international hubs &amp; commercial passenger terminals worldwide
          </span>
        </div>
      </div>
    </div>
  );
}
