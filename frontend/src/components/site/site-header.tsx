"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { BookingsDialog } from "@/components/bookings/bookings-dialog";
import { useCurrency } from "@/components/site/currency-context";
import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

type DialogContent = "support";

export function SiteHeader() {
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogContent | null>(null);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                setBookingsOpen(true);
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
                <option value="USD">USD</option>
                <option value="INR">INR</option>
              </select>
            </label>

            <button
              className="support-link"
              type="button"
              onClick={() => setDialog("support")}
            >
              <Icon name="support" size={16} />
              <span>24/7 Support</span>
            </button>

            {isAuthenticated && user ? (
              <div className="site-header__user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="user-profile-btn"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                >
                  <span className="user-avatar-circle">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span className="user-profile-name">{user.full_name}</span>
                  <Icon name="chevron-down" size={14} />
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown__header">
                      <strong>{user.full_name}</strong>
                      <span>{user.email}</span>
                      {user.membership && (
                        <span className="user-membership-pill">
                          {user.membership.tier} · {user.membership.miles.toLocaleString()} Miles
                        </span>
                      )}
                    </div>
                    <div className="user-dropdown__items">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setBookingsOpen(true);
                        }}
                      >
                        <Icon name="plane" size={15} />
                        My Reservations
                      </button>
                      <button
                        type="button"
                        className="user-dropdown__logout"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  className="text-button site-header__login"
                  type="button"
                  onClick={() => openAuthModal("login")}
                >
                  Login
                </button>
                <button
                  className="button button--primary button--small"
                  type="button"
                  onClick={() => openAuthModal("register")}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Real Trips & Bookings dialog */}
      <BookingsDialog open={bookingsOpen} onClose={() => setBookingsOpen(false)} />

      {/* Support Dialog */}
      <PreviewDialog
        open={dialog === "support"}
        title="24/7 Concierge Support"
        message="Our dedicated flight concierge team is reachable via phone (+1 800 SKY-FARE), live chat, and support@skyfare.com for schedule updates, emergency reroutings, and corporate charters."
        onClose={() => setDialog(null)}
      />
    </>
  );
}
