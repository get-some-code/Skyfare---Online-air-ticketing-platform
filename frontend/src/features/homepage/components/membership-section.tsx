"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

const membershipBenefits = [
  "Global Lounges",
  "Zero Reschedule Fee",
  "Fast Track Security",
  "Concierge Desk",
];

export function MembershipSection() {
  const { user, isAuthenticated, openAuthModal, joinPrivilegeClub } = useAuth();
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  async function handleJoin() {
    if (!isAuthenticated) {
      openAuthModal("register");
      return;
    }
    if (user?.membership) {
      setFeedback({
        title: "Active Privilege Club Member",
        message: `You are already enrolled as a ${user.membership.tier} tier member with ${user.membership.miles.toLocaleString()} earned miles. Enjoy your global executive benefits!`,
      });
      return;
    }
    try {
      await joinPrivilegeClub();
      setFeedback({
        title: "Welcome to the Platinum Club",
        message: "Your SkyFare Privilege Club membership is now active! You will now automatically earn corporate miles on every flight and charter booking.",
      });
    } catch (err: unknown) {
      setFeedback({
        title: "Enrollment Error",
        message: err instanceof Error ? err.message : "Failed to activate membership.",
      });
    }
  }

  return (
    <>
      <section
        id="membership"
        className="membership-section scroll-discover"
        aria-labelledby="membership-heading"
      >
        <div className="membership-section__copy">
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
              onClick={handleJoin}
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
            <span className="membership-card__badge">
              {user?.membership ? user.membership.tier : "Platinum Club"}
            </span>
          </div>
          <strong>{user?.membership ? `${user.membership.miles.toLocaleString()} Miles` : "125,000+"}</strong>
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
        open={feedback !== null}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        onClose={() => setFeedback(null)}
      />
    </>
  );
}
