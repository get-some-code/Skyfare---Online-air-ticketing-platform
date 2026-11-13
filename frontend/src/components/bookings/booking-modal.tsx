"use client";

import React, { useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import { createBookingApi } from "@/lib/api/auth";
import type { BookingPublic, FlightOffer } from "@/lib/api/types";

interface BookingModalProps {
  flight: FlightOffer | null;
  onClose: () => void;
  onSuccess?: (booking: BookingPublic) => void;
}

export function BookingModal({ flight, onClose, onSuccess }: BookingModalProps) {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [passengerName, setPassengerName] = useState(user?.full_name ?? "");
  const [dob, setDob] = useState("");
  const [corporate, setCorporate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingPublic | null>(null);

  if (!flight) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!flight) return;

    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createBookingApi({
        fare_ids: [flight.fare_id],
        trip_type: "one-way",
        currency: flight.price.currency,
        corporate_travel: corporate,
        passengers: [
          {
            full_name: passengerName.trim(),
            date_of_birth: dob || undefined,
          },
        ],
      });
      setConfirmedBooking(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete reservation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="auth-modal booking-modal">
        <button
          type="button"
          className="auth-modal__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="x" size={18} />
        </button>

        {confirmedBooking ? (
          <div className="booking-confirmed">
            <div className="booking-confirmed__icon">
              <Icon name="check" size={32} />
            </div>
            <h2 id="booking-modal-title">Reservation Confirmed!</h2>
            <p>
              Your flight has been securely held. Your SkyFare reference code is:
            </p>
            <div className="booking-confirmed__ref">
              <strong>{confirmedBooking.reference}</strong>
            </div>
            <div className="booking-confirmed__summary">
              <div>
                <span>Route:</span>
                <strong>
                  {flight.origin.code} → {flight.destination.code}
                </strong>
              </div>
              <div>
                <span>Flight:</span>
                <strong>
                  {flight.airline.name} ({flight.flight_number})
                </strong>
              </div>
              <div>
                <span>Cabin &amp; Total:</span>
                <strong>
                  {flight.cabin.toUpperCase()} · {flight.price.currency === "INR" ? "₹" : "$"}
                  {Number(confirmedBooking.total_amount).toLocaleString()}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="button button--primary"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="auth-modal__header">
              <div className="auth-modal__brand">
                <Icon name="plane" size={20} />
                <span>FLIGHT RESERVATION</span>
              </div>
              <h2 id="booking-modal-title">Confirm Passenger &amp; Trip Details</h2>
              <p>
                {flight.airline.name} · Flight {flight.flight_number} ·{" "}
                {flight.origin.code} → {flight.destination.code}
              </p>
            </div>

            <div className="booking-card-summary">
              <div className="booking-card-summary__col">
                <span className="booking-label">Departure</span>
                <strong>{flight.origin.code}</strong>
                <span>
                  {new Date(flight.depart_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="booking-card-summary__mid">
                <span>{flight.duration_minutes}m</span>
                <div className="booking-card-summary__line" />
                <span>{flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}</span>
              </div>
              <div className="booking-card-summary__col">
                <span className="booking-label">Arrival</span>
                <strong>{flight.destination.code}</strong>
                <span>
                  {new Date(flight.arrive_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="booking-card-summary__price">
                <span className="booking-label">Total Fare</span>
                <strong>
                  {flight.price.currency === "INR" ? "₹" : "$"}
                  {Number(flight.price.total).toLocaleString()}
                </strong>
              </div>
            </div>

            {error && (
              <div className="auth-modal__error" role="alert">
                <Icon name="spark" size={16} />
                <span>{error}</span>
              </div>
            )}

            {!isAuthenticated && (
              <div className="booking-auth-prompt">
                <Icon name="plane" size={16} />
                <span>
                  Sign in required to link booking and corporate GST credit.
                </span>
                <button
                  type="button"
                  className="button button--small button--primary"
                  onClick={() => openAuthModal("login")}
                >
                  Sign In
                </button>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-field">
                <span>Passenger Full Name (as per Passport/ID)</span>
                <input
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="e.g. Captain Monideep Mukherjee"
                  autoFocus
                />
              </label>

              <label className="auth-field">
                <span>Date of Birth (optional)</span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </label>

              <label className="check-option booking-corporate-check">
                <input
                  type="checkbox"
                  checked={corporate}
                  onChange={(e) => setCorporate(e.target.checked)}
                />
                <span>Apply Corporate SOW / Automated GSTIN invoice</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="button button--primary auth-submit"
              >
                {loading ? "Holding Seat & Reserving…" : "Reserve Flight"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
