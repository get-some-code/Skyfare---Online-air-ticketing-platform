"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { getSeatMapApi } from "@/lib/api/bookings";
import type { SeatMapResponse, SeatMapSeat, SeatSelectionItem } from "@/lib/api/types";

interface SeatMapProps {
  flightId: string;
  flightNumber: string;
  passengers: Array<{ name: string; type?: string }>;
  selectedSeats: SeatSelectionItem[];
  onSelectSeat: (seatItem: SeatSelectionItem) => void;
  currency?: "INR" | "USD";
  fareTier?: "saver" | "flexi" | "executive";
}

export function SeatMap({
  flightId,
  flightNumber,
  passengers,
  selectedSeats,
  onSelectSeat,
  currency = "INR",
  fareTier = "saver",
}: SeatMapProps) {
  const [seatMap, setSeatMap] = useState<SeatMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    getSeatMapApi(flightId)
      .then((data) => {
        if (!ignore) {
          setSeatMap(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [flightId]);

  if (loading) {
    return (
      <div className="seat-map-loading">
        <div className="spinner" />
        <p>Loading aircraft cabin configuration...</p>
      </div>
    );
  }

  if (!seatMap) {
    return (
      <div className="seat-map-error">
        <p>Unable to load seat map for this flight segment.</p>
      </div>
    );
  }

  // Group seats by row
  const rowsMap = new Map<number, SeatMapSeat[]>();
  for (const s of seatMap.seats) {
    if (!rowsMap.has(s.row)) {
      rowsMap.set(s.row, []);
    }
    rowsMap.get(s.row)!.push(s);
  }
  const rowNumbers = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  function getSeatPrice(seat: SeatMapSeat): number {
    const rawPrice = currency === "INR" ? parseFloat(seat.price_inr) : parseFloat(seat.price_usd);
    if (fareTier === "flexi" || fareTier === "executive") {
      return Math.round(rawPrice * 0.5);
    }
    return rawPrice;
  }

  function handleSeatClick(seat: SeatMapSeat) {
    if (seat.status === "occupied" || seat.status === "held") return;

    const price = getSeatPrice(seat);
    onSelectSeat({
      flight_id: flightId,
      passenger_index: activePassengerIndex,
      seat_number: seat.seat_number,
      seat_class: seat.seat_class,
      price,
    });

    // Auto-advance to next passenger if more exist
    if (activePassengerIndex < passengers.length - 1) {
      setActivePassengerIndex(activePassengerIndex + 1);
    }
  }

  return (
    <div className="seat-selection-container">
      {/* Passenger Switcher Tabs */}
      <div className="seat-passenger-bar">
        <span className="seat-passenger-bar__label">Assigning Seat:</span>
        <div className="seat-passenger-tabs">
          {passengers.map((p, idx) => {
            const currentSeat = selectedSeats.find(
              (s) => s.flight_id === flightId && s.passenger_index === idx,
            );
            const isActive = idx === activePassengerIndex;
            return (
              <button
                key={idx}
                type="button"
                className={`seat-passenger-tab ${isActive ? "is-active" : ""}`}
                onClick={() => setActivePassengerIndex(idx)}
              >
                <Icon name="user" size={14} />
                <span className="seat-passenger-name">{p.name || `Passenger ${idx + 1}`}</span>
                <span className="seat-passenger-tag">
                  {currentSeat ? currentSeat.seat_number : "No Seat"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seat Legend */}
      <div className="seat-legend">
        <div className="seat-legend__item">
          <div className="seat-box seat-box--available" />
          <span>Available</span>
        </div>
        <div className="seat-legend__item">
          <div className="seat-box seat-box--selected" />
          <span>Selected</span>
        </div>
        <div className="seat-legend__item">
          <div className="seat-box seat-box--occupied" />
          <span>Occupied</span>
        </div>
        <div className="seat-legend__item">
          <div className="seat-box seat-box--exit" />
          <span>Emergency Exit</span>
        </div>
        <div className="seat-legend__item">
          <div className="seat-box seat-box--legroom" />
          <span>Extra Legroom</span>
        </div>
      </div>

      {/* Aircraft Fuselage Shell */}
      <div className="fuselage-wrapper">
        <div className="fuselage-nose">
          <div className="fuselage-cockpit">
            <Icon name="compass" size={18} />
            <span>Cockpit</span>
          </div>
          <div className="fuselage-aircraft-info">
            <strong>{seatMap.aircraft}</strong>
            <span>Flight {flightNumber}</span>
          </div>
        </div>

        <div className="cabin-container">
          {rowNumbers.map((rowNum) => {
            const seats = rowsMap.get(rowNum) || [];
            const leftSeats = seats.filter((s) => ["A", "B", "C"].includes(s.col));
            const rightSeats = seats.filter((s) => ["D", "E", "F"].includes(s.col));
            const isExitRow = [12, 13, 14].includes(rowNum);

            return (
              <div
                key={rowNum}
                className={`cabin-row ${isExitRow ? "cabin-row--exit" : ""}`}
              >
                {/* Emergency Exit Tag */}
                {isExitRow && leftSeats[0]?.col === "A" && (
                  <div className="exit-sign exit-sign--left">EXIT</div>
                )}

                {/* Left 3 Seats (A, B, C) */}
                <div className="cabin-seat-group">
                  {leftSeats.map((seat) => {
                    const isSelectedByThis = selectedSeats.some(
                      (s) =>
                        s.flight_id === flightId &&
                        s.passenger_index === activePassengerIndex &&
                        s.seat_number === seat.seat_number,
                    );
                    const isSelectedByOther = selectedSeats.some(
                      (s) =>
                        s.flight_id === flightId &&
                        s.passenger_index !== activePassengerIndex &&
                        s.seat_number === seat.seat_number,
                    );
                    const isOccupied = seat.status === "occupied" || seat.status === "held";
                    const price = getSeatPrice(seat);

                    let seatModifier = "available";
                    if (isSelectedByThis) seatModifier = "selected";
                    else if (isSelectedByOther) seatModifier = "other-passenger";
                    else if (isOccupied) seatModifier = "occupied";
                    else if (seat.seat_class === "emergency_exit") seatModifier = "exit";
                    else if (seat.seat_class === "extra_legroom") seatModifier = "legroom";
                    else if (seat.seat_class === "front_row") seatModifier = "front";

                    return (
                      <button
                        key={seat.seat_number}
                        type="button"
                        disabled={isOccupied}
                        className={`seat-button seat-button--${seatModifier}`}
                        onClick={() => handleSeatClick(seat)}
                        title={`Seat ${seat.seat_number} (${seat.seat_class}) - ${
                          price === 0 ? "Complimentary" : `${currency === "INR" ? "₹" : "$"}${price}`
                        }`}
                      >
                        <span className="seat-button__label">{seat.seat_number}</span>
                        {price > 0 && !isOccupied && (
                          <span className="seat-button__price">
                            {currency === "INR" ? `₹${price}` : `$${price}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Center Aisle */}
                <div className="cabin-aisle">
                  <span>{rowNum}</span>
                </div>

                {/* Right 3 Seats (D, E, F) */}
                <div className="cabin-seat-group">
                  {rightSeats.map((seat) => {
                    const isSelectedByThis = selectedSeats.some(
                      (s) =>
                        s.flight_id === flightId &&
                        s.passenger_index === activePassengerIndex &&
                        s.seat_number === seat.seat_number,
                    );
                    const isSelectedByOther = selectedSeats.some(
                      (s) =>
                        s.flight_id === flightId &&
                        s.passenger_index !== activePassengerIndex &&
                        s.seat_number === seat.seat_number,
                    );
                    const isOccupied = seat.status === "occupied" || seat.status === "held";
                    const price = getSeatPrice(seat);

                    let seatModifier = "available";
                    if (isSelectedByThis) seatModifier = "selected";
                    else if (isSelectedByOther) seatModifier = "other-passenger";
                    else if (isOccupied) seatModifier = "occupied";
                    else if (seat.seat_class === "emergency_exit") seatModifier = "exit";
                    else if (seat.seat_class === "extra_legroom") seatModifier = "legroom";
                    else if (seat.seat_class === "front_row") seatModifier = "front";

                    return (
                      <button
                        key={seat.seat_number}
                        type="button"
                        disabled={isOccupied}
                        className={`seat-button seat-button--${seatModifier}`}
                        onClick={() => handleSeatClick(seat)}
                        title={`Seat ${seat.seat_number} (${seat.seat_class}) - ${
                          price === 0 ? "Complimentary" : `${currency === "INR" ? "₹" : "$"}${price}`
                        }`}
                      >
                        <span className="seat-button__label">{seat.seat_number}</span>
                        {price > 0 && !isOccupied && (
                          <span className="seat-button__price">
                            {currency === "INR" ? `₹${price}` : `$${price}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Exit Sign */}
                {isExitRow && rightSeats[rightSeats.length - 1]?.col === "F" && (
                  <div className="exit-sign exit-sign--right">EXIT</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
