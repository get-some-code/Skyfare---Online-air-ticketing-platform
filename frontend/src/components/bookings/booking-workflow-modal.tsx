"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import {
  calculatePriceApi,
  createBookingEnhancedApi,
  payBookingApi,
} from "@/lib/api/bookings";
import type {
  AddonSelectionItem,
  BookingCreate,
  BookingPublic,
  FlightOffer,
  PassengerCreate,
  PaymentRequest,
  PriceBreakdown,
  SeatSelectionItem,
} from "@/lib/api/types";
import { AddonSelector } from "./addon-selector";
import { ConfirmationView } from "./confirmation-view";
import { PaymentGateway } from "./payment-gateway";
import { SeatMap } from "./seat-map";
import { getAirportByCode } from "@/features/homepage/data/airports-catalog";

interface BookingWorkflowModalProps {
  flight: FlightOffer | null;
  returnFlight?: FlightOffer | null;
  travellersCount?: number;
  onClose: () => void;
  onSuccess?: (booking: BookingPublic) => void;
}

type StepKey = "tier" | "passengers" | "seats" | "addons" | "review" | "payment" | "confirmed";

export function BookingWorkflowModal({
  flight,
  returnFlight,
  travellersCount = 1,
  onClose,
  onSuccess,
}: BookingWorkflowModalProps) {
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const [currentStep, setCurrentStep] = useState<StepKey>("tier");
  const [fareTier, setFareTier] = useState<"saver" | "flexi" | "executive">("saver");

  // Multi-passenger form state
  const [passengers, setPassengers] = useState<PassengerCreate[]>(() => {
    return Array.from({ length: travellersCount }).map((_, i) => ({
      title: i === 0 ? "Mr" : "Ms",
      first_name: i === 0 ? (user?.full_name?.split(" ")[0] || "") : "",
      last_name: i === 0 ? (user?.full_name?.split(" ").slice(1).join(" ") || "") : "",
      full_name: i === 0 ? (user?.full_name || "") : "",
      passenger_type: "adult",
      gender: "male",
      nationality: "Indian",
      date_of_birth: "",
    }));
  });

  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "+91 98765 43210");
  const [corporate, setCorporate] = useState(false);

  // Seat & Add-ons state
  const [selectedSeats, setSelectedSeats] = useState<SeatSelectionItem[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<AddonSelectionItem[]>([]);

  // Server-side Price Breakdown
  const [breakdown, setBreakdown] = useState<PriceBreakdown | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Booking Session & Hold State
  const [bookingInProgress, setBookingInProgress] = useState<BookingPublic | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [payingBooking, setPayingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingPublic | null>(null);

  // Check international
  const isInternational =
    flight?.origin.code !== "DEL" && flight?.origin.code !== "BOM" && flight?.origin.code !== "CCU" && flight?.origin.code !== "BLR" && flight?.origin.code !== "MAA" && flight?.origin.code !== "HYD";

  // Re-calculate price breakdown whenever flight, tier, travellers, seats, or addons change
  useEffect(() => {
    if (!flight) return;
    const fareIds = [flight.fare_id];
    if (returnFlight) fareIds.push(returnFlight.fare_id);

    let ignore = false;
    calculatePriceApi({
      fare_ids: fareIds,
      travellers: passengers.length,
      fare_tier: fareTier,
      currency: flight.price.currency,
      seats: selectedSeats,
      addons: selectedAddons,
    })
      .then((data) => {
        if (!ignore) {
          setBreakdown(data);
          setLoadingPrice(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoadingPrice(false);
      });
    return () => {
      ignore = true;
    };
  }, [flight, returnFlight, fareTier, passengers.length, selectedSeats, selectedAddons]);

  if (!flight) return null;

  function updatePassenger(index: number, field: keyof PassengerCreate, value: string) {
    setPassengers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "first_name" || field === "last_name" || field === "title") {
        const title = copy[index].title || "";
        const fn = copy[index].first_name || "";
        const ln = copy[index].last_name || "";
        copy[index].full_name = `${title} ${fn} ${ln}`.trim();
      }
      return copy;
    });
  }

  function handleSelectSeat(seatItem: SeatSelectionItem) {
    setSelectedSeats((prev) => {
      // Remove any existing seat for this flight & passenger
      const filtered = prev.filter(
        (s) => !(s.flight_id === seatItem.flight_id && s.passenger_index === seatItem.passenger_index),
      );
      // If clicking same seat, unselect
      const isSame = prev.some(
        (s) =>
          s.flight_id === seatItem.flight_id &&
          s.passenger_index === seatItem.passenger_index &&
          s.seat_number === seatItem.seat_number,
      );
      if (isSame) return filtered;
      return [...filtered, seatItem];
    });
  }

  async function handleProceedToPayment() {
    if (!isAuthenticated && !contactEmail) {
      openAuthModal("login");
      return;
    }

    setCreatingBooking(true);
    setBookingError(null);

    const fareIds = [flight!.fare_id];
    if (returnFlight) fareIds.push(returnFlight.fare_id);

    const payload: BookingCreate = {
      fare_ids: fareIds,
      trip_type: returnFlight ? "round-trip" : "one-way",
      currency: flight!.price.currency,
      corporate_travel: corporate,
      fare_tier: fareTier,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      passengers,
      seats: selectedSeats,
      addons: selectedAddons,
    };

    try {
      const res = await createBookingEnhancedApi(payload, {
        flight,
        returnFlight,
        breakdown,
      });
      setBookingInProgress(res);
      setCurrentStep("payment");
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Failed to hold seats.");
    } finally {
      setCreatingBooking(false);
    }
  }

  async function handleExecutePayment(req: PaymentRequest) {
    if (!bookingInProgress) return;
    setPayingBooking(true);
    setBookingError(null);

    try {
      const payRes = await payBookingApi(bookingInProgress.reference, req);
      if (payRes.booking) {
        setConfirmedBooking(payRes.booking);
        setCurrentStep("confirmed");
        if (onSuccess) onSuccess(payRes.booking);
      } else {
        throw new Error(payRes.error_message || "Payment transaction could not be completed.");
      }
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Payment processing error.");
    } finally {
      setPayingBooking(false);
    }
  }

  if (!flight) return null;

  const originAirport = getAirportByCode(flight.origin.code);
  const destAirport = getAirportByCode(flight.destination.code);
  const originCity = originAirport?.city || flight.origin.city || flight.origin.code;
  const destCity = destAirport?.city || flight.destination.city || flight.destination.code;

  return (
    <div
      className="auth-overlay booking-workflow-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-workflow-title"
    >
      <div className="booking-workflow-modal">
        {/* Header */}
        <div className="workflow-header">
          <div className="workflow-header__title-wrap">
            <h2 id="booking-workflow-title">
              {originCity} ({flight.origin.code}) → {destCity} ({flight.destination.code})
              {returnFlight && ` (Roundtrip via ${returnFlight.origin.code})`}
            </h2>
            <p className="workflow-header__subtitle">
              {flight.airline.name} • Flight {flight.flight_number} • {flight.depart_on}
            </p>
          </div>
          <button
            type="button"
            className="workflow-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Stepper Navigation */}
        {currentStep !== "confirmed" && (
          <div className="workflow-stepper">
            {[
              { key: "tier", label: "1. Fare Tier" },
              { key: "passengers", label: "2. Passengers" },
              { key: "seats", label: "3. Seats" },
              { key: "addons", label: "4. Add-ons" },
              { key: "review", label: "5. Review & Hold" },
              { key: "payment", label: "6. Payment" },
            ].map((step, idx) => {
              const isPast =
                ["tier", "passengers", "seats", "addons", "review", "payment"].indexOf(currentStep) > idx;
              const isCurrent = currentStep === step.key;
              return (
                <div
                  key={step.key}
                  className={`stepper-pill ${isCurrent ? "is-current" : ""} ${isPast ? "is-past" : ""}`}
                >
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Body content based on step */}
        <div className="workflow-body">
          {/* STEP 1: FARE TIER SELECTION */}
          {currentStep === "tier" && (
            <div className="step-pane step-tier">
              <h3>Choose Your Fare Family</h3>
              <p>Select the ticket flexibility and privileges that match your schedule.</p>

              <div className="tier-cards-grid">
                {/* Saver */}
                <div
                  className={`tier-card ${fareTier === "saver" ? "is-selected" : ""}`}
                  onClick={() => setFareTier("saver")}
                >
                  <div className="tier-card__header">
                    <h4>SkySaver</h4>
                    <span className="tier-price-badge">Base Price</span>
                  </div>
                  <p className="tier-card__desc">Best value for travellers with fixed, predictable dates.</p>
                  <ul className="tier-perks">
                    <li><Icon name="check" size={14} /> 7 kg Cabin Baggage included</li>
                    <li><Icon name="check" size={14} /> 15 kg Check-in Baggage</li>
                    <li><Icon name="x" size={14} /> Date change fee applies</li>
                    <li><Icon name="x" size={14} /> Standard seat fees apply</li>
                  </ul>
                  <button
                    type="button"
                    className={`tier-select-btn ${fareTier === "saver" ? "is-active" : ""}`}
                  >
                    {fareTier === "saver" ? "Selected" : "Select Saver"}
                  </button>
                </div>

                {/* Flexi */}
                <div
                  className={`tier-card ${fareTier === "flexi" ? "is-selected" : ""}`}
                  onClick={() => setFareTier("flexi")}
                >
                  <div className="tier-card__badge-popular">MOST POPULAR</div>
                  <div className="tier-card__header">
                    <h4>SkyFlexi</h4>
                    <span className="tier-price-badge">+18% Fare</span>
                  </div>
                  <p className="tier-card__desc">Ultimate peace of mind with free date changes &amp; 50% off seats.</p>
                  <ul className="tier-perks">
                    <li><Icon name="check" size={14} /> 7 kg Cabin + 15 kg Check-in</li>
                    <li><Icon name="check" size={14} /> Unlimited FREE date rescheduling</li>
                    <li><Icon name="check" size={14} /> 50% discount on preferred seats</li>
                    <li><Icon name="check" size={14} /> Low ₹500 cancellation fee</li>
                  </ul>
                  <button
                    type="button"
                    className={`tier-select-btn ${fareTier === "flexi" ? "is-active" : ""}`}
                  >
                    {fareTier === "flexi" ? "Selected" : "Select Flexi"}
                  </button>
                </div>

                {/* Executive */}
                <div
                  className={`tier-card ${fareTier === "executive" ? "is-selected" : ""}`}
                  onClick={() => setFareTier("executive")}
                >
                  <div className="tier-card__header">
                    <h4>SkyExecutive</h4>
                    <span className="tier-price-badge">+45% Fare</span>
                  </div>
                  <p className="tier-card__desc">All-inclusive VIP experience with priority check-in and meals.</p>
                  <ul className="tier-perks">
                    <li><Icon name="check" size={14} /> Complimentary Front-Row &amp; Exit Seats</li>
                    <li><Icon name="check" size={14} /> Free Gourmet Hot Meal included</li>
                    <li><Icon name="check" size={14} /> Priority Check-in &amp; Boarding</li>
                    <li><Icon name="check" size={14} /> Zero cancellation fee</li>
                  </ul>
                  <button
                    type="button"
                    className={`tier-select-btn ${fareTier === "executive" ? "is-active" : ""}`}
                  >
                    {fareTier === "executive" ? "Selected" : "Select Executive"}
                  </button>
                </div>
              </div>

              <div className="workflow-footer-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCurrentStep("passengers")}
                >
                  Next: Passenger Details →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PASSENGER INFORMATION */}
          {currentStep === "passengers" && (
            <div className="step-pane step-passengers">
              <h3>Passenger &amp; Contact Information</h3>
              <p>Ensure names exactly match government-issued photo ID (Aadhaar, Passport).</p>

              <div className="passengers-forms-list">
                {passengers.map((p, idx) => (
                  <div key={idx} className="passenger-form-card">
                    <div className="passenger-form-card__header">
                      <Icon name="user" size={16} />
                      <h4>Passenger {idx + 1} ({p.passenger_type})</h4>
                    </div>
                    <div className="passenger-inputs-grid">
                      <div className="form-group form-group--small">
                        <label>Title</label>
                        <select
                          value={p.title || "Mr"}
                          onChange={(e) => updatePassenger(idx, "title", e.target.value)}
                        >
                          <option value="Mr">Mr</option>
                          <option value="Ms">Ms</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Dr">Dr</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>First Name</label>
                        <input
                          type="text"
                          value={p.first_name || ""}
                          onChange={(e) => updatePassenger(idx, "first_name", e.target.value)}
                          placeholder="Given name"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Last Name</label>
                        <input
                          type="text"
                          value={p.last_name || ""}
                          onChange={(e) => updatePassenger(idx, "last_name", e.target.value)}
                          placeholder="Surname"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Gender</label>
                        <select
                          value={p.gender || "male"}
                          onChange={(e) => updatePassenger(idx, "gender", e.target.value)}
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          value={p.date_of_birth || ""}
                          onChange={(e) => updatePassenger(idx, "date_of_birth", e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Nationality</label>
                        <input
                          type="text"
                          value={p.nationality || "Indian"}
                          onChange={(e) => updatePassenger(idx, "nationality", e.target.value)}
                        />
                      </div>

                      {isInternational && (
                        <>
                          <div className="form-group">
                            <label>Passport Number</label>
                            <input
                              type="text"
                              value={p.passport_number || ""}
                              onChange={(e) => updatePassenger(idx, "passport_number", e.target.value)}
                              placeholder="e.g. Z1234567"
                            />
                          </div>
                          <div className="form-group">
                            <label>Passport Expiry</label>
                            <input
                              type="date"
                              value={p.passport_expiry || ""}
                              onChange={(e) => updatePassenger(idx, "passport_expiry", e.target.value)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Primary Contact Details */}
              <div className="contact-details-box">
                <h4>Primary Contact &amp; E-Ticket Delivery</h4>
                <div className="contact-inputs-grid">
                  <div className="form-group">
                    <label htmlFor="contact-email">Email Address</label>
                    <input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contact-phone">Phone Number (with country code)</label>
                    <input
                      id="contact-phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={corporate}
                        onChange={(e) => setCorporate(e.target.checked)}
                      />
                      <span>Generate Corporate GST invoice with input tax credit</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="workflow-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentStep("tier")}
                >
                  ← Back to Fares
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCurrentStep("seats")}
                >
                  Next: Choose Seats →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SEAT SELECTION */}
          {currentStep === "seats" && (
            <div className="step-pane step-seats">
              <h3>Select Aircraft Seats</h3>
              <p>Choose window, aisle, or extra legroom exit seats for your journey.</p>

              <SeatMap
                flightId={flight.flight_id}
                flightNumber={flight.flight_number}
                passengers={passengers.map((p) => ({ name: p.full_name || "Passenger" }))}
                selectedSeats={selectedSeats}
                onSelectSeat={handleSelectSeat}
                currency={flight.price.currency}
                fareTier={fareTier}
              />

              <div className="workflow-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentStep("passengers")}
                >
                  ← Back to Passengers
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCurrentStep("addons")}
                >
                  Next: Add-ons &amp; Baggage →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ADD-ONS & BAGGAGE */}
          {currentStep === "addons" && (
            <div className="step-pane step-addons">
              <h3>Customise Your Flight</h3>
              <p>Pre-order hot chef meals, extra baggage, and fast-track boarding.</p>

              <AddonSelector
                passengers={passengers.map((p) => ({ name: p.full_name || "Passenger" }))}
                selectedAddons={selectedAddons}
                onChangeAddons={setSelectedAddons}
                currency={flight.price.currency}
              />

              <div className="workflow-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentStep("seats")}
                >
                  ← Back to Seats
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setCurrentStep("review")}
                >
                  Next: Review Booking →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: BOOKING REVIEW & HOLD */}
          {currentStep === "review" && (
            <div className="step-pane step-review">
              <div className="step-review__intro">
                <h3>Review Flight Itinerary &amp; Price Breakdown</h3>
                <p>Lock in this reservation to hold seats for 10 minutes while you complete payment.</p>
              </div>

              <div className="review-itinerary-card">
                <div className="review-itinerary-header">
                  <div className="review-itinerary-airline">
                    <span className="airline-badge">{flight.airline.name}</span>
                    <span className="flight-no">{flight.flight_number}</span>
                    <span className="aircraft-pill">{flight.aircraft}</span>
                  </div>
                  <span className="review-tier-badge">{fareTier.toUpperCase()} TIER</span>
                </div>

                <div className="review-flight-row">
                  <div className="review-endpoint review-endpoint--origin">
                    <div className="review-time">
                      {new Date(flight.depart_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="review-city">{originCity} ({flight.origin.code})</div>
                    <div className="review-date">{flight.depart_on}</div>
                  </div>

                  <div className="flight-duration-center">
                    <span className="flight-duration-text">
                      {Math.floor(flight.duration_minutes / 60)}h {flight.duration_minutes % 60}m
                    </span>
                    <div className="flight-track">
                      <span className="track-line" />
                      <Icon name="plane" size={14} className="track-plane" />
                      <span className="track-line" />
                    </div>
                    <span className="flight-stop-badge">
                      {flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}
                    </span>
                  </div>

                  <div className="review-endpoint review-endpoint--dest">
                    <div className="review-time">
                      {new Date(flight.arrive_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="review-city">{destCity} ({flight.destination.code})</div>
                    <div className="review-date">{flight.depart_on}</div>
                  </div>
                </div>

                {/* Passenger & Seat Assignment strip */}
                <div className="review-passenger-summary">
                  <span className="review-summary-label">Travellers &amp; Assigned Seats:</span>
                  <div className="review-passenger-chips">
                    {passengers.map((p, idx) => {
                      const assignedSeat = selectedSeats.find((s) => s.passenger_index === idx);
                      return (
                        <div key={idx} className="review-passenger-chip">
                          <Icon name="user" size={13} />
                          <span>
                            {p.first_name || p.last_name
                              ? `${p.title} ${p.first_name} ${p.last_name}`.trim()
                              : `Passenger ${idx + 1}`}
                          </span>
                          <span className="review-chip-seat">
                            Seat: <strong>{assignedSeat?.seat_number || "Auto-assigned"}</strong>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Itemized Price Breakdown */}
              {breakdown && (
                <div className="review-breakdown-card">
                  <div className="review-breakdown-header">
                    <h4>Fare Summary</h4>
                    <span className="currency-tag">All prices in {breakdown.currency}</span>
                  </div>
                  <div className="review-table">
                    <div className="review-row">
                      <span className="review-row-label">
                        Base Airfare ({passengers.length} Traveller{passengers.length > 1 ? "s" : ""}, {fareTier.toUpperCase()})
                      </span>
                      <strong className="review-row-val">{breakdown.currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.base_fare).toLocaleString()}</strong>
                    </div>
                    <div className="review-row">
                      <span className="review-row-label">Airport Taxes, UDF &amp; Aviation GST</span>
                      <strong className="review-row-val">{breakdown.currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.taxes_and_fees).toLocaleString()}</strong>
                    </div>
                    {parseFloat(breakdown.seats_fee) > 0 && (
                      <div className="review-row">
                        <span className="review-row-label">Selected Seats ({selectedSeats.length} Seat{selectedSeats.length > 1 ? "s" : ""})</span>
                        <strong className="review-row-val">{breakdown.currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.seats_fee).toLocaleString()}</strong>
                      </div>
                    )}
                    {parseFloat(breakdown.addons_fee) > 0 && (
                      <div className="review-row">
                        <span className="review-row-label">Add-ons &amp; Baggage ({selectedAddons.length} item{selectedAddons.length > 1 ? "s" : ""})</span>
                        <strong className="review-row-val">{breakdown.currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.addons_fee).toLocaleString()}</strong>
                      </div>
                    )}
                    <div className="review-row">
                      <span className="review-row-label">Convenience &amp; Platform Processing Fee</span>
                      <strong className="review-row-val">{breakdown.currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.convenience_fee).toLocaleString()}</strong>
                    </div>
                    <div className="review-total-divider" />
                    <div className="review-row review-row--total">
                      <div>
                        <div className="review-total-label">Total Guaranteed Payable</div>
                        <div className="review-total-hint">Includes all taxes, fees &amp; selected extras</div>
                      </div>
                      <strong className="review-total-amount">
                        {breakdown.currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.total).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {bookingError && (
                <div className="payment-error-banner" role="alert">
                  <Icon name="alert-circle" size={16} />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="workflow-footer-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCurrentStep("addons")}
                >
                  ← Back to Add-ons
                </button>
                <button
                  type="button"
                  disabled={creatingBooking || loadingPrice}
                  className="btn-primary"
                  onClick={handleProceedToPayment}
                >
                  {creatingBooking ? (
                    <>
                      <div className="spinner-inline" />
                      <span>Holding Seats in Inventory...</span>
                    </>
                  ) : (
                    <span>Hold Seats &amp; Proceed to Pay →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PAYMENT GATEWAY */}
          {currentStep === "payment" && bookingInProgress && (
            <div className="step-pane step-payment">
              <PaymentGateway
                amount={bookingInProgress.total_amount}
                currency={bookingInProgress.currency}
                heldUntil={bookingInProgress.held_until}
                onPay={handleExecutePayment}
                loading={payingBooking}
                error={bookingError}
                breakdown={breakdown}
              />
            </div>
          )}

          {/* STEP 7: CONFIRMATION & E-TICKET */}
          {currentStep === "confirmed" && confirmedBooking && (
            <ConfirmationView
              booking={confirmedBooking}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
