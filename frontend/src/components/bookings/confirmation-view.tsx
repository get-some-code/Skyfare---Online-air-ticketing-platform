"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { downloadTicketPdfUrl } from "@/lib/api/bookings";
import type { BookingPublic } from "@/lib/api/types";

interface ConfirmationViewProps {
  booking: BookingPublic;
  onClose: () => void;
  onOpenMyBookings?: () => void;
}

export function ConfirmationView({
  booking,
  onClose,
  onOpenMyBookings,
}: ConfirmationViewProps) {
  const [copied, setCopied] = useState(false);

  function copyReference() {
    navigator.clipboard.writeText(booking.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pdfUrl = downloadTicketPdfUrl(booking.reference);

  return (
    <div className="booking-confirmed-card">
      {/* Header Banner */}
      <div className="booking-confirmed-banner">
        <div className="booking-confirmed-banner__check">
          <Icon name="check" size={32} />
        </div>
        <h2>Simulated Flight Reservation Confirmed!</h2>
        <p>
          Your airline e-ticket has been generated and seat assignments are locked in inventory.
        </p>

        <div className="booking-pnr-box">
          <div className="booking-pnr-box__label">SKYFARE BOOKING REFERENCE (PNR)</div>
          <div className="booking-pnr-box__row">
            <span className="booking-pnr-box__code">{booking.reference}</span>
            <button
              type="button"
              className="booking-pnr-box__copy"
              onClick={copyReference}
              aria-label="Copy PNR reference"
            >
              <Icon name={copied ? "check" : "copy"} size={16} />
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Flight Segments */}
      <div className="booking-confirmed-section">
        <h3>Flight Itinerary</h3>
        <div className="booking-segments-list">
          {booking.segments.map((seg) => (
            <div key={seg.id} className="booking-segment-item">
              <div className="segment-airline">
                <span className="airline-name">{seg.airline_name}</span>
                <span className="flight-number">{seg.flight_number}</span>
                <span className="cabin-badge">{seg.cabin}</span>
              </div>
              <div className="segment-route">
                <div className="segment-origin">
                  <strong>{seg.origin_code}</strong>
                  <span>{new Date(seg.depart_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <small>{new Date(seg.depart_at).toLocaleDateString([], { month: "short", day: "numeric" })}</small>
                </div>
                <div className="segment-arrow">
                  <Icon name="plane" size={16} />
                </div>
                <div className="segment-destination">
                  <strong>{seg.destination_code}</strong>
                  <span>{new Date(seg.arrive_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <small>{new Date(seg.arrive_at).toLocaleDateString([], { month: "short", day: "numeric" })}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passengers & Seats */}
      <div className="booking-confirmed-section">
        <h3>Passengers &amp; Seat Assignments</h3>
        <div className="booking-passengers-grid">
          {booking.passengers.map((p, idx) => {
            const seatRes = (booking.seat_reservations || []).find(
              (r) => r.passenger_id === p.id || (!r.passenger_id && idx === 0),
            );
            const assignedSeat = p.seat_number || (seatRes ? seatRes.seat_number : "Unassigned");
            return (
              <div key={p.id || idx} className="passenger-summary-card">
                <div className="passenger-summary-card__top">
                  <Icon name="user" size={16} />
                  <strong>{p.full_name}</strong>
                  <span className="passenger-type-badge">{p.passenger_type || "adult"}</span>
                </div>
                <div className="passenger-summary-card__details">
                  <div className="detail-item">
                    <span>Seat:</span>
                    <strong className="seat-badge">{assignedSeat}</strong>
                  </div>
                  {p.ticket_number && (
                    <div className="detail-item">
                      <span>E-Ticket No:</span>
                      <code>{p.ticket_number}</code>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment & Invoice Summary */}
      <div className="booking-confirmed-section">
        <h3>Payment &amp; Transaction Details</h3>
        <div className="payment-receipt-box">
          <div className="payment-receipt-row">
            <span>Payment Status</span>
            <span className="status-badge status-badge--success">PAID (Simulated)</span>
          </div>
          <div className="payment-receipt-row">
            <span>Total Amount Paid</span>
            <strong>
              {booking.currency === "INR" ? "₹" : "$"}{parseFloat(booking.total_amount).toLocaleString()}
            </strong>
          </div>
          {booking.payments && booking.payments[0] && (
            <div className="payment-receipt-row">
              <span>Transaction Reference</span>
              <code>{booking.payments[0].transaction_ref}</code>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="booking-confirmed-actions">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-download-pdf"
        >
          <Icon name="file-text" size={18} />
          <span>Download Official E-Ticket (PDF)</span>
        </a>

        {onOpenMyBookings && (
          <button
            type="button"
            className="btn-my-trips"
            onClick={onOpenMyBookings}
          >
            <Icon name="calendar" size={16} />
            <span>View in My Bookings</span>
          </button>
        )}

        <button
          type="button"
          className="btn-close-confirmed"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
