"use client";

import Link from "next/link";
import { useState } from "react";

import { useCurrency } from "@/components/site/currency-context";
import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

type DialogContent = "account" | "trips" | "support";

const dialogCopy: Record<DialogContent, { title: string; message: string }> = {
  account: {
    title: "Account access is coming soon",
    message:
      "Sign-in and registration are not connected in this development preview. No credentials are requested or stored.",
  },
  trips: {
    title: "Your trips will appear here",
    message:
      "Trip management is not available in this preview. No bookings have been created or retrieved.",
  },
  support: {
    title: "Support details are not connected",
    message:
      "This preview does not have a live support channel. Contact information will be added before launch.",
  },
};

export function SiteHeader() {
  const { currency, setCurrency } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogContent | null>(null);
  const activeDialog = dialog ? dialogCopy[dialog] : null;

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      <header id="top" className="site-header">
        <div className="site-header__inner">
          <Link
            href="/"
            className="wordmark"
            aria-label="SkyFare home"
            onClick={closeMenu}
          >
            SKYFARE
          </Link>

          <button
            className="icon-button site-header__menu-toggle"
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
          >
            <Icon name={mobileMenuOpen ? "x" : "menu"} />
          </button>

          <nav
            id="primary-navigation"
            className={`site-header__nav${mobileMenuOpen ? " is-open" : ""}`}
            aria-label="Main navigation"
          >
            <Link href="/" onClick={closeMenu}>
              Home
            </Link>
            <Link href="/#search" onClick={closeMenu}>
              Search Flights
            </Link>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setDialog("trips");
              }}
            >
              My Bookings
            </button>
            <Link href="/#why-skyfare" onClick={closeMenu}>
              About Us
            </Link>
          </nav>

          <div className="site-header__actions">
            <label className="currency-select">
              <span className="sr-only">Display currency</span>
              <select
                value={currency}
                onChange={(event) => {
                  const nextCurrency = event.target.value;
                  if (nextCurrency === "INR" || nextCurrency === "USD") {
                    setCurrency(nextCurrency);
                  }
                }}
                aria-label="Display currency"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <button
              className="support-link"
              type="button"
              onClick={() => setDialog("support")}
            >
              <Icon name="support" size={16} />
              <span>Help &amp; Support</span>
            </button>
            <button
              className="text-button site-header__login"
              type="button"
              onClick={() => setDialog("account")}
            >
              Login
            </button>
            <button
              className="button button--primary button--small"
              type="button"
              onClick={() => setDialog("account")}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <PreviewDialog
        open={dialog !== null}
        title={activeDialog?.title ?? ""}
        message={activeDialog?.message ?? ""}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
