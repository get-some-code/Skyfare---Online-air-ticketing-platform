"use client";

import React, { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import { cancelBookingEnhancedApi, downloadTicketPdfUrl, getLocalBookings } from "@/lib/api/bookings";
import { getBookingsApi } from "@/lib/api/auth";
import type { BookingPublic } from "@/lib/api/types";

const emptySubscribe = () => () => {};

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="bookings-page-loading">
          <div className="spinner" />
          <p>Loading your flight reservations...</p>
        </div>
      }
    >
      <BookingsPageContent />
    </Suspense>
  );
}

function BookingsPageContent() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [bookings, setBookings] = useState<BookingPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingPublic | null>(null);
  const [cancelReason, setCancelReason] = useState("Change of travel plans");
  const [processingCancel, setProcessingCancel] = useState(false);
  const [currentTime] = useState(() => Date.now());

  useEffect(() => {
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
          setBookings(getLocalBookings());
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleUpdate = () => {
      getBookingsApi().then((data) => setBookings(data));
    };
    window.addEventListener("skyfare:booking_updated", handleUpdate);
    window.addEventListener("skyfare:booking_confirmed", handleUpdate);
    return () => {
      window.removeEventListener("skyfare:booking_updated", handleUpdate);
      window.removeEventListener("skyfare:booking_confirmed", handleUpdate);
    };
  }, []);

  async function handleConfirmCancel() {
    if (!cancelModalBooking) return;
    setProcessingCancel(true);

    try {
      const updated = await cancelBookingEnhancedApi(cancelModalBooking.reference, {
        reason: cancelReason,
      });
      setBookings((prev) =>
        prev.map((b) => (b.reference === cancelModalBooking.reference ? updated : b)),
      );
      setCancelModalBooking(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cancellation failed.");
    } finally {
      setProcessingCancel(false);
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const isCancelled = ["cancelled", "CANCELLED"].includes(b.status);
    const depTime = b.segments[0]?.depart_at ? new Date(b.segments[0].depart_at).getTime() : 0;
    const isPast = currentTime ? depTime < currentTime : false;

    if (activeTab === "cancelled") return isCancelled;
    if (activeTab === "completed") return !isCancelled && isPast;
    if (activeTab === "upcoming") return !isCancelled && !isPast;
    return true;
  });

  return (
    <div className="bookings-page-container">
      <div className="bookings-page-header">
        <div>
          <span className="eyebrow eyebrow--blue">
            <Icon name="plane" size={16} />
            SkyFare Trips &amp; E-Tickets
          </span>
          <h1>My Flight Bookings</h1>
          <p>View confirmed itineraries, download official PDF e-tickets, and manage simulated flight changes.</p>
        </div>
        <Link href="/flights/search" className="button button--primary">
          <Icon name="search" size={16} />
          <span>Book New Flight</span>
        </Link>
      </div>

      {!mounted || (loading && isAuthenticated) ? (
        <div className="bookings-page-loading">
          <div className="spinner" />
          <p>Loading your flight reservations...</p>
        </div>
      ) : !isAuthenticated && bookings.length === 0 ? (
        <div className="bookings-page-unauth">
          <Icon name="lock" size={48} className="unauth-icon" />
          <h2>Sign In to View Your Trips</h2>
          <p>Access your saved itineraries, boarding passes, seat maps, and corporate GST profile.</p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => openAuthModal("login")}
          >
            Sign In to SkyFare
          </button>
        </div>
      ) : (
        <div className="bookings-page-content">
          {!isAuthenticated && bookings.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "20px",
                color: "#1e3a8a",
                fontSize: "14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Icon name="plane" size={18} />
                <span>Showing recent flight bookings made on this device. Sign in to link them permanently to your SkyFare account.</span>
              </div>
              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={() => openAuthModal("login")}
                style={{ flexShrink: 0 }}
              >
                Sign In
              </button>
            </div>
          )}
          <div className="bookings-tab-bar" role="tablist">
            {[
              { key: "all", label: `All Trips (${bookings.length})` },
              {
                key: "upcoming",
                label: `Upcoming (${bookings.filter((b) => !["cancelled", "CANCELLED"].includes(b.status)).length})`,
              },
              {
                key: "completed",
                label: `Completed (${bookings.filter((b) => !["cancelled", "CANCELLED"].includes(b.status) && (currentTime ? new Date(b.segments[0]?.depart_at || 0).getTime() < currentTime : false)).length})`,
              },
              {
                key: "cancelled",
                label: `Cancelled (${bookings.filter((b) => ["cancelled", "CANCELLED"].includes(b.status)).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`bookings-tab-btn ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key as "all" | "upcoming" | "completed" | "cancelled")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bookings-page-empty">
              <Icon name="plane" size={40} className="empty-icon" />
              <h3>No bookings found in this category</h3>
              <p>Ready to travel? Search commercial routes across 50+ domestic &amp; international hubs.</p>
              <Link href="/flights/search" className="button button--primary">
                Search Flights
              </Link>
            </div>
          ) : (
            <div className="bookings-page-grid">
              {filteredBookings.map((booking) => {
                const seg = booking.segments[0];
                const isCancelled = ["cancelled", "CANCELLED"].includes(booking.status);
                const isConfirmed = ["confirmed", "CONFIRMED"].includes(booking.status);
                const pdfUrl = downloadTicketPdfUrl(booking.reference);

                return (
                  <div
                    key={booking.id}
                    className={`booking-card-item ${isCancelled ? "is-cancelled" : ""}`}
                  >
                    <div className="booking-card-item__header">
                      <div className="booking-ref-group">
                        <span className="booking-ref-label">Booking Reference:</span>
                        <strong className="booking-ref-code">{booking.reference}</strong>
                        <span className="booking-date">
                          Booked on{" "}
                          {new Date(booking.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className={`booking-status-badge status--${booking.status.toLowerCase()}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    {seg && (
                      <div className="booking-card-item__route">
                        <div className="route-endpoints">
                          <div className="endpoint">
                            <strong>{seg.origin_code}</strong>
                            <span>{new Date(seg.depart_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <small>{new Date(seg.depart_at).toLocaleDateString([], { month: "short", day: "numeric" })}</small>
                          </div>
                          <div className="route-arrow">
                            <Icon name="plane" size={16} />
                          </div>
                          <div className="endpoint">
                            <strong>{seg.destination_code}</strong>
                            <span>{new Date(seg.arrive_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <small>{new Date(seg.arrive_at).toLocaleDateString([], { month: "short", day: "numeric" })}</small>
                          </div>
                        </div>
                        <div className="flight-meta-details">
                          <span>{seg.airline_name} · Flight {seg.flight_number}</span>
                          <span className="cabin-pill">{seg.cabin}</span>
                          {booking.fare_tier && <span className="tier-pill">{booking.fare_tier.toUpperCase()}</span>}
                        </div>
                      </div>
                    )}

                    <div className="booking-passengers-strip">
                      {booking.passengers.map((p, idx) => {
                        const seatRes = (booking.seat_reservations || []).find(
                          (r) => r.passenger_id === p.id || (!r.passenger_id && idx === 0),
                        );
                        const seatNum = p.seat_number || (seatRes ? seatRes.seat_number : null);
                        return (
                          <span key={p.id || idx} className="passenger-pill">
                            <Icon name="user" size={12} />
                            {p.full_name}
                            {seatNum && <strong className="seat-badge">{seatNum}</strong>}
                          </span>
                        );
                      })}
                    </div>

                    {booking.cancellation && (
                      <div className="cancellation-notice-box">
                        <Icon name="info" size={14} />
                        <span>
                          Refund {booking.cancellation.refund_status}: {booking.currency === "INR" ? "₹" : "$"}{parseFloat(booking.cancellation.refund_amount).toLocaleString()} (Ref: {booking.cancellation.refund_reference})
                        </span>
                      </div>
                    )}

                    <div className="booking-card-item__footer">
                      <div className="booking-price-tag">
                        <span>Total Paid:</span>
                        <strong>
                          {booking.currency === "INR" ? "₹" : "$"}{parseFloat(booking.total_amount).toLocaleString()}
                        </strong>
                      </div>

                      <div className="booking-action-buttons">
                        {isConfirmed && (
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-action-pdf"
                          >
                            <Icon name="file-text" size={14} />
                            <span>Download E-Ticket (PDF)</span>
                          </a>
                        )}

                        {!isCancelled && (
                          <button
                            type="button"
                            className="btn-action-cancel"
                            onClick={() => setCancelModalBooking(booking)}
                          >
                            Cancel Reservation
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalBooking && (
        <div className="auth-overlay cancel-confirmation-overlay">
          <div className="auth-modal cancel-modal">
            <div className="cancel-modal__header">
              <Icon name="alert-circle" size={24} className="alert-icon" />
              <h3>Cancel Flight Booking {cancelModalBooking.reference}</h3>
            </div>
            <p>
              Are you sure you want to cancel this reservation? Released seats will be instantly returned to inventory.
            </p>

            <div className="cancel-refund-preview">
              <div className="preview-row">
                <span>Total Amount Paid</span>
                <strong>{cancelModalBooking.currency === "INR" ? "₹" : "$"}{parseFloat(cancelModalBooking.total_amount).toLocaleString()}</strong>
              </div>
              <div className="preview-row">
                <span>Fare Tier</span>
                <span>{cancelModalBooking.fare_tier?.toUpperCase() || "SAVER"}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="Change of travel plans">Change of travel plans</option>
                <option value="Medical or personal emergency">Medical or personal emergency</option>
                <option value="Booking made by mistake">Booking made by mistake</option>
                <option value="Flight schedule inconvenient">Flight schedule inconvenient</option>
              </select>
            </div>

            <div className="cancel-modal-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={processingCancel}
                onClick={() => setCancelModalBooking(null)}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={processingCancel}
                onClick={handleConfirmCancel}
              >
                {processingCancel ? "Cancelling & Refunding..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
