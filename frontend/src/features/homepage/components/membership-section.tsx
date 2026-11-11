"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

const membershipBenefits = [
  "Global Lounges",
  "Zero Reschedule Fee",
  "Fast Track Security",
  "Concierge Desk",
];

export function MembershipSection() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <section
        id="membership"
        className="membership-section scroll-discover"
        aria-labelledby="membership-heading"
      >
        <div className="membership-section__copy">
          <span className="eyebrow eyebrow--dark">
            <Icon name="spark" size={16} />
            Loyalty Rewards &amp; Corporate SOW
          </span>
          <h2 id="membership-heading">
            SkyFare Privilege Club &amp; Enterprise Pass
          </h2>
          <p>
            Earn corporate air miles on every scheduled flight and private
            charter. Unlock VIP lounge privileges globally, priority boarding,
            zero cancellation penalties, and single-click automated GSTR-2B
            input credit reconciliation for your company.
          </p>
          <div className="membership-section__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setDialogOpen(true)}
            >
              Join Free Today
              <Icon name="arrow-right" size={18} />
            </button>
            <a className="button button--dark" href="#why-skyfare">
              Explore Enterprise Benefits
              <Icon name="chevron-right" size={18} />
            </a>
          </div>
        </div>

        <div className="membership-card">
          <div className="membership-card__top">
            <span>EXECUTIVE TIER LEVEL</span>
            <span className="membership-card__badge">Platinum Club</span>
          </div>
          <strong>125,000+</strong>
          <div className="membership-card__rule" />
          <ul>
            {membershipBenefits.map((benefit) => (
              <li key={benefit}>
                <Icon name="check" size={16} />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <PreviewDialog
        open={dialogOpen}
        title="Membership registration is coming soon"
        message="SkyFare Privilege Club enrolment will be available once account management is live. You will be able to earn miles and access lounge benefits on every booking."
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
