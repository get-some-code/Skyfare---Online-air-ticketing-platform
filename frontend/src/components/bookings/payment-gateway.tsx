"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { PaymentRequest, PriceBreakdown } from "@/lib/api/types";

interface PaymentGatewayProps {
  amount: string;
  currency: "INR" | "USD";
  heldUntil?: string | null;
  onPay: (req: PaymentRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
  breakdown?: PriceBreakdown | null;
}

export function PaymentGateway({
  amount,
  currency,
  heldUntil,
  onPay,
  loading,
  error,
  breakdown,
}: PaymentGatewayProps) {
  const [method, setMethod] = useState<"card" | "upi" | "netbanking" | "wallet">("card");
  const [cardNumber, setCardNumber] = useState("4111 •••• •••• 4242");
  const [cardHolder, setCardHolder] = useState("ARJUN MEHTA");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("892");
  const [upiId, setUpiId] = useState("skyfarer@okhdfcbank");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [simulationMode, setSimulationMode] = useState<"success" | "fail" | "timeout">("success");

  // Hold Timer (10 minutes)
  const [timeLeft, setTimeLeft] = useState<number>(600);

  useEffect(() => {
    if (!heldUntil) return;
    const updateTimer = () => {
      const remainingMs = new Date(heldUntil).getTime() - Date.now();
      const sec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeLeft(sec);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [heldUntil]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpiringSoon = timeLeft < 180; // < 3 mins

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const [expMonth, expYear] = expiry.split("/");
    const req: PaymentRequest = {
      payment_method: method,
      idempotency_key: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      simulate_outcome: simulationMode,
    };

    if (method === "card") {
      req.card_number = cardNumber.replace(/\D/g, "") || "4111111111114242";
      req.card_holder = cardHolder;
      req.expiry_month = expMonth?.trim() || "12";
      req.expiry_year = expYear?.trim() || "28";
      req.cvv = cvv;
    } else if (method === "upi") {
      req.upi_vpa = upiId;
    } else if (method === "netbanking") {
      req.bank_name = selectedBank;
    }

    await onPay(req);
  }

  return (
    <div className="payment-gateway-container">
      {/* Hold Expiration Alert */}
      <div className={`hold-timer-banner ${isExpiringSoon ? "hold-timer-banner--urgent" : ""}`}>
        <div className="hold-timer-banner__left">
          <Icon name="clock" size={18} />
          <span>
            {isExpiringSoon ? "Seat hold expiring soon:" : "Seats held for your session:"}
          </span>
        </div>
        <div className="hold-timer-banner__time">
          <strong>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </strong>
        </div>
      </div>

      <div className="payment-gateway-grid">
        {/* Payment Methods */}
        <div className="payment-methods-pane">
          <div className="payment-method-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={method === "card"}
              className={`payment-method-tab ${method === "card" ? "is-active" : ""}`}
              onClick={() => setMethod("card")}
            >
              <Icon name="credit-card" size={16} />
              <span>Credit / Debit Card</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === "upi"}
              className={`payment-method-tab ${method === "upi" ? "is-active" : ""}`}
              onClick={() => setMethod("upi")}
            >
              <Icon name="smartphone" size={16} />
              <span>UPI Instant (GPay / PhonePe)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === "netbanking"}
              className={`payment-method-tab ${method === "netbanking" ? "is-active" : ""}`}
              onClick={() => setMethod("netbanking")}
            >
              <Icon name="building" size={16} />
              <span>Net Banking</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === "wallet"}
              className={`payment-method-tab ${method === "wallet" ? "is-active" : ""}`}
              onClick={() => setMethod("wallet")}
            >
              <Icon name="wallet" size={16} />
              <span>Digital Wallets</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="payment-form">
            {method === "card" && (
              <div className="payment-fields">
                <div className="form-group">
                  <label htmlFor="card-num">Card Number</label>
                  <div className="input-with-icon">
                    <Icon name="credit-card" size={16} />
                    <input
                      id="card-num"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4111 2222 3333 4444"
                      required
                    />
                    <span className="card-brand-badge">VISA</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="card-name">Cardholder Name</label>
                  <input
                    id="card-name"
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Name as printed on card"
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="card-exp">Expiry (MM/YY)</label>
                    <input
                      id="card-exp"
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="12/28"
                      maxLength={5}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="card-cvv">CVV / CVC</label>
                    <input
                      id="card-cvv"
                      type="password"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {method === "upi" && (
              <div className="payment-fields">
                <div className="form-group">
                  <label htmlFor="upi-vpa">Virtual Payment Address (VPA / UPI ID)</label>
                  <div className="input-with-icon">
                    <Icon name="smartphone" size={16} />
                    <input
                      id="upi-vpa"
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="username@okhdfcbank"
                      required
                    />
                  </div>
                </div>
                <div className="upi-app-chips">
                  {["@okaxis", "@okhdfcbank", "@paytm", "@ibl", "@ybl"].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      className="upi-app-chip"
                      onClick={() => setUpiId(`traveler${handle}`)}
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {method === "netbanking" && (
              <div className="payment-fields">
                <div className="form-group">
                  <label>Select Your Bank</label>
                  <div className="bank-grid">
                    {["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra"].map(
                      (bank) => (
                        <button
                          key={bank}
                          type="button"
                          className={`bank-card ${selectedBank === bank ? "is-selected" : ""}`}
                          onClick={() => setSelectedBank(bank)}
                        >
                          <Icon name="building" size={16} />
                          <span>{bank}</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            {method === "wallet" && (
              <div className="payment-fields">
                <div className="form-group">
                  <label>Select Mobile Wallet</label>
                  <div className="bank-grid">
                    {["Paytm Wallet", "Amazon Pay", "Mobikwik", "PhonePe Wallet"].map((wallet) => (
                      <button
                        key={wallet}
                        type="button"
                        className={`bank-card ${selectedBank === wallet ? "is-selected" : ""}`}
                        onClick={() => setSelectedBank(wallet)}
                      >
                        <Icon name="wallet" size={16} />
                        <span>{wallet}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Gateway Controls for QA testing */}
            <div className="gateway-sim-controls">
              <span className="gateway-sim-controls__label">
                <Icon name="shield-check" size={14} />
                Sandbox Payment Simulator:
              </span>
              <div className="gateway-sim-options">
                <label className="sim-radio">
                  <input
                    type="radio"
                    name="sim_mode"
                    checked={simulationMode === "success"}
                    onChange={() => setSimulationMode("success")}
                  />
                  <span>Simulate Success</span>
                </label>
                <label className="sim-radio">
                  <input
                    type="radio"
                    name="sim_mode"
                    checked={simulationMode === "fail"}
                    onChange={() => setSimulationMode("fail")}
                  />
                  <span>Simulate Decline</span>
                </label>
                <label className="sim-radio">
                  <input
                    type="radio"
                    name="sim_mode"
                    checked={simulationMode === "timeout"}
                    onChange={() => setSimulationMode("timeout")}
                  />
                  <span>Simulate Timeout</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="payment-error-banner" role="alert">
                <Icon name="alert-circle" size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || timeLeft <= 0}
              className="pay-submit-btn"
            >
              {loading ? (
                <>
                  <div className="spinner-inline" />
                  <span>Processing Secure Payment...</span>
                </>
              ) : (
                <>
                  <Icon name="lock" size={16} />
                  <span>
                    Pay {currency === "INR" ? "₹" : "$"}{parseFloat(amount).toLocaleString()} &amp; Confirm Ticket
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        {breakdown && (
          <div className="payment-summary-card">
            <h4>Price Breakdown</h4>
            <div className="summary-line-items">
              <div className="summary-line">
                <span>Base Airfare</span>
                <strong>
                  {currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.base_fare).toLocaleString()}
                </strong>
              </div>
              <div className="summary-line">
                <span>Airport Taxes &amp; Fees</span>
                <strong>
                  {currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.taxes_and_fees).toLocaleString()}
                </strong>
              </div>
              {parseFloat(breakdown.seats_fee) > 0 && (
                <div className="summary-line">
                  <span>Selected Seats</span>
                  <strong>
                    {currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.seats_fee).toLocaleString()}
                  </strong>
                </div>
              )}
              {parseFloat(breakdown.addons_fee) > 0 && (
                <div className="summary-line">
                  <span>Add-on Services</span>
                  <strong>
                    {currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.addons_fee).toLocaleString()}
                  </strong>
                </div>
              )}
              <div className="summary-line">
                <span>Convenience Fee</span>
                <strong>
                  {currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.convenience_fee).toLocaleString()}
                </strong>
              </div>
              <div className="summary-total-divider" />
              <div className="summary-total-line">
                <span>Total Payable</span>
                <strong>
                  {currency === "INR" ? "₹" : "$"}{parseFloat(breakdown.total).toLocaleString()}
                </strong>
              </div>
            </div>
            <div className="payment-trust-badge">
              <Icon name="shield-check" size={16} />
              <span>Simulated 256-bit TLS Encrypted Commercial Sandbox</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
