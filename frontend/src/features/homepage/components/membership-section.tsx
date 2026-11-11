"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

const previewBenefits = [
  "Travel rewards concept",
  "Priority service concepts",
  "Business travel tools",
  "Flexible itinerary controls",
];

export function MembershipSection() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <section
        id="membership"
        className="membership-section"
        aria-labelledby="membership-heading"
      >
        <div className="membership-section__copy">
          <span className="eyebrow eyebrow--dark">
            <Icon name="spark" size={16} />
            Loyalty &amp; corporate travel concept
          </span>
          <h2 id="membership-heading">
            SkyFare Privilege Club &amp; Enterprise Pass
          </h2>
          <p>
            Explore a concept for travel rewards, considered service, and tools
            that help teams manage a journey in one place.
          </p>
          <div className="membership-section__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setDialogOpen(true)}
            >
              Explore the preview
              <Icon name="arrow-right" size={18} />
            </button>
            <a className="button button--dark" href="#why-skyfare">
              How it is designed
              <Icon name="chevron-right" size={18} />
            </a>
          </div>
        </div>

        <div className="membership-card">
          <div className="membership-card__top">
            <span>MEMBERSHIP EXPERIENCE</span>
            <span className="membership-card__badge">Design preview</span>
          </div>
          <strong>Travel, thoughtfully.</strong>
          <div className="membership-card__rule" />
          <ul>
            {previewBenefits.map((benefit) => (
              <li key={benefit}>
                <Icon name="check" size={16} />
                {benefit}
              </li>
            ))}
          </ul>
          <p>No membership, rewards, or entitlements are active.</p>
        </div>
      </section>
      <PreviewDialog
        open={dialogOpen}
        title="Membership is a design preview"
        message="This concept does not create an account or activate rewards and travel benefits."
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
