import { Icon } from "@/components/ui/icon";

export function TrustBar() {
  return (
    <div className="trust-bar" role="banner" aria-label="Service information">
      <div className="trust-bar__inner">
        <span className="trust-bar__pulse">
          <span className="trust-bar__dot" aria-hidden="true" />
          <span className="trust-bar__label">LIVE FARE PULSE</span>
          <span className="trust-bar__message">
            Kolkata (CCU) → Dubai (DXB) fares updated — compare lowest fares
            across 500+ airlines.
          </span>
        </span>
        <span className="trust-bar__signals">
          <span className="trust-bar__signal">
            <Icon name="shield" size={14} />
            IATA Certified
          </span>
          <span className="trust-bar__sep" aria-hidden="true">|</span>
          <span className="trust-bar__signal">
            <Icon name="receipt" size={14} />
            Zero Hidden Surcharges
          </span>
        </span>
      </div>
    </div>
  );
}
