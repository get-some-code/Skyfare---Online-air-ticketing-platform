"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/icon";
import { airports } from "@/features/homepage/data/homepage-fixtures";
import {
  ALL_AIRPORTS,
  AirportItem,
  getAirportByCode,
} from "../data/airports-catalog";
import { AirportSearchModal } from "./airport-search-modal";

type TripType = "round-trip" | "one-way" | "multi-city";

interface FlightSearchFormProps {
  selectedDestination: string;
  onDestinationChange: (value: string) => void;
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function airportCode(value: string): string {
  const match = value.trim().match(/^([a-z]{3})\b/i);
  return match ? match[1].toUpperCase() : value.trim();
}

export function FlightSearchForm({
  selectedDestination,
  onDestinationChange,
}: FlightSearchFormProps) {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [origin, setOrigin] = useState("CCU - Kolkata");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [via, setVia] = useState("");
  const [travellers, setTravellers] = useState(1);
  const [cabin, setCabin] = useState("Business / Flexi");
  const [directOnly, setDirectOnly] = useState(true);
  const [flexibleDates, setFlexibleDates] = useState(true);
  const [corporateTravel, setCorporateTravel] = useState(false);
  const [travellerPickerOpen, setTravellerPickerOpen] = useState(false);
  const [today, setToday] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchModalField, setSearchModalField] = useState<
    "origin" | "destination" | "via" | null
  >(null);
  const travellerPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!travellerPickerOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !travellerPickerRef.current?.contains(event.target)
      ) {
        setTravellerPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [travellerPickerOpen]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    const params = new URLSearchParams({
      tripType,
      origin: airportCode(origin),
      destination: airportCode(selectedDestination),
      departure: departureDate,
      travellers: String(travellers),
      cabin,
      directOnly: String(directOnly),
      flexibleDates: String(flexibleDates),
      corporateTravel: String(corporateTravel),
    });

    if (tripType === "round-trip" && returnDate) {
      params.set("return", returnDate);
    }
    if (tripType === "multi-city" && via.trim()) {
      params.set("via", airportCode(via));
    }

    router.push(`/flights/search?${params.toString()}`);
  }

  function handleDestinationChange(value: string) {
    onDestinationChange(value);
  }

  function handleSelectAirport(airport: AirportItem) {
    const value = `${airport.code} - ${airport.city}`;
    if (searchModalField === "origin") {
      setOrigin(value);
    } else if (searchModalField === "destination") {
      handleDestinationChange(value);
    } else if (searchModalField === "via") {
      setVia(value);
    }
    setSearchModalField(null);
  }

  const originAirport =
    getAirportByCode(origin) ??
    airports.find((airport) => airport.code === airportCode(origin));

  const destAirport =
    getAirportByCode(selectedDestination) ??
    airports.find(
      (airport) => airport.code === airportCode(selectedDestination),
    );

  const viaAirport = via
    ? getAirportByCode(via) ??
      airports.find((airport) => airport.code === airportCode(via))
    : undefined;

  return (
    <>
      <form className="flight-search" onSubmit={handleSubmit}>
        <div className="flight-search__top">
          <div className="trip-tabs" role="group" aria-label="Trip type">
            {(
              [
                ["round-trip", "↔", "Round-trip"],
                ["one-way", "→", "One-way"],
                ["multi-city", "✣", "Multi-city"],
              ] as const
            ).map(([type, symbol, label]) => (
              <button
                key={type}
                type="button"
                className={`trip-tabs__tab${tripType === type ? " is-active" : ""}`}
                aria-pressed={tripType === type}
                onClick={() => setTripType(type)}
              >
                <span aria-hidden="true">{symbol}</span>
                {label}
              </button>
            ))}
          </div>
          <span className="flight-search__tier">
            TIER <strong>Executive Commercial</strong>
          </span>
        </div>

        <div className="flight-search__body">
          <datalist id="skyfare-airports">
            {ALL_AIRPORTS.map((airport) => (
              <option
                key={airport.code}
                value={`${airport.code} - ${airport.city}`}
              >
                {airport.airport} ({airport.country})
              </option>
            ))}
          </datalist>

          <div className="flight-search__fields">
            {/* Origin Airport Field */}
            <div className="search-field search-field--airport search-field--origin">
              <div className="search-field__top-row">
                <span className="search-field__label">Departure city</span>
                <button
                  type="button"
                  className="search-field__place-btn"
                  onClick={() => setSearchModalField("origin")}
                  aria-label="Search departure places and international airports"
                >
                  <Icon name="search" size={11} />
                  <span>Search Places</span>
                </button>
              </div>
              <span className="search-field__airport">
                <input
                  list="skyfare-airports"
                  name="origin"
                  value={origin}
                  onChange={(event) => setOrigin(event.target.value)}
                  aria-label="Departure city"
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  className="search-field__icon-btn"
                  onClick={() => setSearchModalField("origin")}
                  title="Browse international airports"
                  aria-label="Browse international airports for departure"
                >
                  <Icon name="plane" size={18} />
                </button>
              </span>
              <span className="search-field__hint">
                {originAirport?.airport ?? "Airport or city"}
              </span>
            </div>

            {/* Airport Swap Button */}
            <button
              className="swap-airports"
              type="button"
              aria-label="Swap departure and destination"
              onClick={() => {
                const currentOrigin = origin;
                setOrigin(selectedDestination);
                handleDestinationChange(currentOrigin);
              }}
            >
              <Icon name="arrow-left-right" size={20} />
            </button>

            {/* Destination Airport Field */}
            <div className="search-field search-field--airport search-field--destination">
              <div className="search-field__top-row">
                <span className="search-field__label">Destination city</span>
                <button
                  type="button"
                  className="search-field__place-btn"
                  onClick={() => setSearchModalField("destination")}
                  aria-label="Search destination places and international airports"
                >
                  <Icon name="search" size={11} />
                  <span>Search Places</span>
                </button>
              </div>
              <span className="search-field__airport">
                <input
                  list="skyfare-airports"
                  name="destination"
                  value={selectedDestination}
                  onChange={(event) => handleDestinationChange(event.target.value)}
                  aria-label="Destination city"
                  autoComplete="off"
                  required
                />
                <button
                  type="button"
                  className="search-field__icon-btn"
                  onClick={() => setSearchModalField("destination")}
                  title="Browse international airports"
                  aria-label="Browse international airports for destination"
                >
                  <Icon name="plane" size={18} />
                </button>
              </span>
              <span className="search-field__hint">
                {destAirport?.airport ?? "Airport or city"}
              </span>
            </div>

            {/* Departure Date Field */}
            <label
              className={`search-field search-field--date search-field--departure${tripType === "one-way" ? " search-field--departure-full" : ""}`}
            >
              <span className="search-field__label">
                {tripType === "multi-city" ? "First departure" : "Departure"}
              </span>
              <span className="search-field__input-wrap">
                <input
                  type="date"
                  name="departure"
                  value={departureDate}
                  min={today || undefined}
                  onFocus={() => {
                    if (!today) setToday(localDateString(new Date()));
                  }}
                  onChange={(event) => setDepartureDate(event.target.value)}
                  aria-label="Departure date"
                  required
                />
                <Icon name="calendar" size={17} />
              </span>
            </label>

            {/* Return Date Field or Multi-city via */}
            {tripType === "round-trip" ? (
              <label className="search-field search-field--date search-field--return">
                <span className="search-field__label">Return</span>
                <span className="search-field__input-wrap">
                  <input
                    type="date"
                    name="return"
                    value={returnDate}
                    min={departureDate || today || undefined}
                    onFocus={() => {
                      if (!today) setToday(localDateString(new Date()));
                    }}
                    onChange={(event) => setReturnDate(event.target.value)}
                    aria-label="Return date"
                    required
                  />
                  <Icon name="calendar" size={17} />
                </span>
              </label>
            ) : tripType === "multi-city" ? (
              <div className="search-field search-field--date search-field--via">
                <div className="search-field__top-row">
                  <span className="search-field__label">Next stop</span>
                  <button
                    type="button"
                    className="search-field__place-btn"
                    onClick={() => setSearchModalField("via")}
                    aria-label="Search next stop places and international airports"
                  >
                    <Icon name="search" size={11} />
                    <span>Search Places</span>
                  </button>
                </div>
                <span className="search-field__airport">
                  <input
                    list="skyfare-airports"
                    value={via}
                    onChange={(event) => setVia(event.target.value)}
                    aria-label="Next stop"
                    placeholder="Airport or city"
                    autoComplete="off"
                  />
                </span>
                <span className="search-field__hint">
                  {viaAirport?.airport ?? "Via airport or city"}
                </span>
              </div>
            ) : null}

            {/* Travellers & Cabin Class Field */}
            <div className="traveller-field" ref={travellerPickerRef}>
              <button
                type="button"
                className="search-field traveller-field__trigger"
                aria-expanded={travellerPickerOpen}
                aria-haspopup="dialog"
                onClick={() => setTravellerPickerOpen((open) => !open)}
              >
                <span className="search-field__label">Travellers &amp; class</span>
                <span className="traveller-field__value">
                  {travellers} {travellers === 1 ? "Adult" : "Adults"}
                </span>
                <span className="traveller-field__cabin">{cabin}</span>
              </button>

              {travellerPickerOpen && (
                <div
                  className="traveller-popover"
                  role="dialog"
                  aria-label="Choose travellers and cabin class"
                >
                  <div className="traveller-popover__row">
                    <div>
                      <strong>Adults</strong>
                      <span>Age 12 and over</span>
                    </div>
                    <div className="stepper">
                      <button
                        type="button"
                        aria-label="Remove one adult"
                        disabled={travellers <= 1}
                        onClick={() =>
                          setTravellers((count) => Math.max(1, count - 1))
                        }
                      >
                        −
                      </button>
                      <output aria-live="polite">{travellers}</output>
                      <button
                        type="button"
                        aria-label="Add one adult"
                        disabled={travellers >= 9}
                        onClick={() =>
                          setTravellers((count) => Math.min(9, count + 1))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <label className="traveller-popover__cabin">
                    Cabin class
                    <select
                      value={cabin}
                      onChange={(event) => setCabin(event.target.value)}
                    >
                      <option>Economy</option>
                      <option>Premium Economy</option>
                      <option>Business / Flexi</option>
                      <option>First Class</option>
                    </select>
                  </label>
                  <button
                    className="button button--secondary button--full"
                    type="button"
                    onClick={() => setTravellerPickerOpen(false)}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>

          {tripType === "multi-city" && (
            <p className="flight-search__multi-note">
              Add the next stop now; additional legs will be supported in a later
              booking phase.
            </p>
          )}

          <div className="flight-search__bottom">
            <div className="search-options">
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(event) => setDirectOnly(event.target.checked)}
                />
                <span>Direct flights only</span>
              </label>
              <label className="check-option">
                <input
                  type="checkbox"
                  checked={flexibleDates}
                  onChange={(event) => setFlexibleDates(event.target.checked)}
                />
                <span>Flexible dates (±3 days)</span>
              </label>
              <label className="check-option check-option--corporate">
                <input
                  type="checkbox"
                  checked={corporateTravel}
                  onChange={(event) => setCorporateTravel(event.target.checked)}
                />
                <span>Corporate travel</span>
              </label>
            </div>
            <button
              className={`button button--primary button--search${isSearching ? " is-searching" : ""}`}
              type="submit"
              disabled={isSearching}
            >
              <Icon
                name="search"
                size={20}
                className={isSearching ? "search-spin-icon" : ""}
              />
              {isSearching ? "Locating Flights…" : "Search Flights"}
            </button>
          </div>
        </div>
      </form>

      {/* Global International Airport & Places Search Modal */}
      <AirportSearchModal
        isOpen={searchModalField !== null}
        onClose={() => setSearchModalField(null)}
        onSelect={handleSelectAirport}
        title={
          searchModalField === "origin"
            ? "Select Departure Airport or City"
            : searchModalField === "destination"
            ? "Select Destination Airport or City"
            : "Select Next Stop Airport or City"
        }
        currentCode={
          searchModalField === "origin"
            ? airportCode(origin)
            : searchModalField === "destination"
            ? airportCode(selectedDestination)
            : airportCode(via)
        }
      />
    </>
  );
}
