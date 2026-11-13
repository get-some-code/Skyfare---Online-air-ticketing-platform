"use client";

import React, { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import { cancelBookingApi, getBookingsApi } from "@/lib/api/auth";
import type { BookingPublic } from "@/lib/api/types";

interface BookingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BookingsDialog({ open, onClose }: BookingsDialogProps) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [bookings, setBookings] = useState<BookingPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isAuthenticated) {
      return;
    }
    let ignore = false;
    getBookingsApi()
      .then((data) => {
        if (!ignore) {
          setBookings(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setBookings([]);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [open, isAuthenticated]);

  if (!open) return null;

  async function handleCancel(ref: string) {
    if (!confirm(`Are you sure you want to cancel booking ${ref}?`)) return;
    setCancellingRef(ref);
    try {
      const updated = await cancelBookingApi(ref);
      setBookings((prev) => prev.map((b) => (b.reference === ref ? updated : b)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setCancellingRef(null);
    }
  }

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookings-dialog-title"
      onClick={onClose}
    >
      <div
        className="auth-modal bookings-dialog-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auth-modal__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="x" size={18} />
        </button>

        <span className="eyebrow eyebrow--blue">
          <Icon name="plane" size={16} />
          SkyFare Trips
        </span>

        <h2 id="bookings-dialog-title" className="bookings-dialog__title">
          Your trips will appear here
        </h2>

        {!isAuthenticated ? (
          <div>
            <p className="bookings-dialog__desc">
              Once you have made a booking, all your upcoming and past trips will
              be accessible from this panel. Sign in to get started.
            </p>
            <div className="bookings-dialog__actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  onClose();
                  openAuthModal("login");
                }}
              >
                Sign In Now
              </button>
              <button type="button" className="button button--secondary" onClick={onClose}>
                Got it
              </button>
            </div>
          </div>
        ) : loading ? (
          <p className="bookings-dialog__loading">Loading your executive reservations…</p>
        ) : bookings.length === 0 ? (
          <div>
            <p className="bookings-dialog__desc">
              No active reservations found for your account. Use the search bar to
              find executive flights and commercial charter routes.
            </p>
            <button type="button" className="button button--primary" onClick={onClose}>
              Got it
            </button>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map((booking) => {
              const seg = booking.segments[0];
              const isCancelled = booking.status === "cancelled";
              return (
                <div key={booking.id} className={`booking-item${isCancelled ? " is-cancelled" : ""}`}>
                  <div className="booking-item__header">
                    <div>
                      <strong className="booking-item__ref">{booking.reference}</strong>
                      <span className="booking-item__date">
                        {new Date(booking.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className={`booking-status booking-status--${booking.status}`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>

                  {seg && (
                    <div className="booking-item__route">
                      <div className="booking-item__cities">
                        <strong>{seg.origin_code}</strong>
                        <span>→</span>
                        <strong>{seg.destination_code}</strong>
                      </div>
                      <div className="booking-item__flight">
                        {seg.airline_name} · {seg.flight_number} · {seg.cabin}
                      </div>
                    </div>
                  )}

                  <div className="booking-item__footer">
                    <div className="booking-item__meta">
                      <span>{booking.traveller_count} Passenger{booking.traveller_count > 1 ? "s" : ""}</span>
                      <strong>
                        {booking.currency === "INR" ? "₹" : "$"}
                        {Number(booking.total_amount).toLocaleString()}
                      </strong>
                    </div>
                    {!isCancelled && (
                      <button
                        type="button"
                        disabled={cancellingRef === booking.reference}
                        className="button button--small button--secondary"
                        onClick={() => handleCancel(booking.reference)}
                      >
                        {cancellingRef === booking.reference ? "Cancelling…" : "Cancel Trip"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
