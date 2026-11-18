"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import { cancelBookingEnhancedApi, downloadTicketPdfUrl, getLocalBookings } from "@/lib/api/bookings";
import { getBookingsApi } from "@/lib/api/auth";
import type { BookingPublic } from "@/lib/api/types";

interface BookingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function BookingsDialog({ open, onClose }: BookingsDialogProps) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [bookings, setBookings] = useState<BookingPublic[]>(() => getLocalBookings());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  // Cancellation modal state
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingPublic | null>(null);
  const [cancelReason, setCancelReason] = useState("Change of travel plans");
  const [processingCancel, setProcessingCancel] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        if (cancelModalBooking) setCancelModalBooking(null);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, cancelModalBooking]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, isAuthenticated]);

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

  if (!open) return null;

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

  // Filter bookings based on activeTab
  const now = new Date();
  const filteredBookings = bookings.filter((b) => {
    const isCancelled = ["cancelled", "CANCELLED"].includes(b.status);
    const depTime = b.segments[0]?.depart_at ? new Date(b.segments[0].depart_at) : now;
    const isPast = depTime < now;

    if (activeTab === "cancelled") return isCancelled;
    if (activeTab === "completed") return !isCancelled && isPast;
    if (activeTab === "upcoming") return !isCancelled && !isPast;
    return true;
  });

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

        <div className="bookings-dialog__top">
          <span className="eyebrow eyebrow--blue">
            <Icon name="plane" size={16} />
            SkyFare Trips &amp; E-Tickets
          </span>
          <h2 id="bookings-dialog-title" className="bookings-dialog__title">
            Your trips will appear here
          </h2>
        </div>

        {!isAuthenticated && bookings.length === 0 ? (
          <div className="bookings-empty-state">
            <p className="bookings-dialog__desc">
              Sign in to access your confirmed e-tickets, seat maps, baggage allowances, and flight change options.
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
        ) : loading && isAuthenticated ? (
          <div className="bookings-loading-state">
            <div className="spinner" />
            <p>Retrieving your confirmed bookings from central reservation systems…</p>
          </div>
        ) : (
          <div className="bookings-content">
            {!isAuthenticated && bookings.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  color: "#1e3a8a",
                  fontSize: "12px",
                }}
              >
                <span>Recent device bookings. Sign in to link to your account.</span>
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => {
                    onClose();
                    openAuthModal("login");
                  }}
                  style={{ marginLeft: "8px", padding: "2px 8px", fontSize: "11px" }}
                >
                  Sign In
                </button>
              </div>
            )}
            {/* Filter Tabs */}
            <div className="bookings-tab-bar" role="tablist">
              {[
                { key: "all", label: `All (${bookings.length})` },
                {
                  key: "upcoming",
                  label: `Upcoming (${bookings.filter((b) => !["cancelled", "CANCELLED"].includes(b.status)).length})`,
                },
                {
                  key: "completed",
                  label: `Completed (${bookings.filter((b) => !["cancelled", "CANCELLED"].includes(b.status) && new Date(b.segments[0]?.depart_at || 0) < now).length})`,
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
              <div className="bookings-empty-state">
                <Icon name="plane" size={32} className="empty-icon" />
                <p>No reservations found under this filter.</p>
                <button type="button" className="button button--primary" onClick={onClose}>
                  Explore Flights
                </button>
              </div>
            ) : (
              <div className="bookings-list">
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
                          <span className="booking-ref-label">PNR:</span>
                          <strong className="booking-ref-code">{booking.reference}</strong>
                          <span className="booking-date">
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
                            </div>
                            <div className="route-arrow">
                              <Icon name="plane" size={14} />
                            </div>
                            <div className="endpoint">
                              <strong>{seg.destination_code}</strong>
                              <span>{new Date(seg.arrive_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                          <div className="flight-meta-details">
                            <span>{seg.airline_name} · {seg.flight_number}</span>
                            <span className="cabin-pill">{seg.cabin}</span>
                            {booking.fare_tier && <span className="tier-pill">{booking.fare_tier.toUpperCase()}</span>}
                          </div>
                        </div>
                      )}

                      {/* Passenger & Seats Manifest */}
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

                      {/* Cancellation & Refund Notice */}
                      {booking.cancellation && (
                        <div className="cancellation-notice-box">
                          <Icon name="info" size={14} />
                          <span>
                            Refund {booking.cancellation.refund_status}: {booking.currency === "INR" ? "₹" : "$"}{parseFloat(booking.cancellation.refund_amount).toLocaleString()} (Ref: {booking.cancellation.refund_reference})
                          </span>
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="booking-card-item__footer">
                        <div className="booking-price-tag">
                          <span>Paid:</span>
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
                              <span>E-Ticket (PDF)</span>
                            </a>
                          )}

                          {!isCancelled && (
                            <button
                              type="button"
                              className="btn-action-cancel"
                              onClick={() => setCancelModalBooking(booking)}
                            >
                              Cancel Flight
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

        {/* Cancellation Confirmation Modal */}
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
                  <span>Fare Tier Flexibility</span>
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
    </div>
  );
}
