"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

export function SiteFooter() {
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterSubmitted(true);
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link href="/" className="wordmark wordmark--light">
            SKYFARE
          </Link>
          <span className="iata-badge">IATA ACCREDITED</span>
          <p>
            Premier international aviation charter and commercial flight booking
            engineered for precision, executive efficiency, and uncompromising
            luxury.
          </p>
          <span className="site-footer__phone">
            <Icon name="support" size={15} />
            +1 800 SKY-FARE &nbsp;<span>(24/7 Helpline)</span>
          </span>
        </div>

        <div className="site-footer__column">
          <h2>Quick Links</h2>
          <Link href="/#search">Search Flights</Link>
          <Link href="/#destinations">Popular Destinations</Link>
          <Link href="/#membership">SkyFare Privilege Club</Link>
          <Link href="/#why-skyfare">Why SkyFare</Link>
        </div>

        <div className="site-footer__column">
          <h2>Top Routes</h2>
          <Link href="/#search">Kolkata → Dubai</Link>
          <Link href="/#search">Delhi → Mumbai</Link>
          <Link href="/#search">Bengaluru → Goa</Link>
          <Link href="/#search">Mumbai → New Delhi</Link>
        </div>

        <div className="site-footer__column">
          <h2>Safety &amp; Support</h2>
          <button
            type="button"
            className="site-footer__link-button"
            onClick={() => setSupportDialogOpen(true)}
          >
            Help Center
          </button>
          <Link href="/#why-skyfare">Aviation Standards</Link>
          <Link href="/#why-skyfare">Baggage &amp; Fares</Link>
          <button
            type="button"
            className="site-footer__link-button"
            onClick={() => setSupportDialogOpen(true)}
          >
            Contact Concierge
          </button>
        </div>

        <div id="newsletter" className="site-footer__newsletter">
          <h2>Newsletter</h2>
          <p>Receive private fare digests and schedule releases.</p>
          {!newsletterSubmitted ? (
            <form onSubmit={handleNewsletterSubmit}>
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="executive@firm.com"
                autoComplete="email"
                required
              />
              <button type="submit" className="button button--primary button--small">
                Join
              </button>
            </form>
          ) : (
            <p className="form-feedback" role="status">
              Thank you — you&apos;re on the list. Expect your first digest
              shortly.
            </p>
          )}
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© 2026 SkyFare. All rights reserved.</span>
        <span className="site-footer__bottom-links">
          <Link href="/#why-skyfare">About</Link>
          <Link href="/#why-skyfare">Privacy Policy</Link>
          <Link href="/#why-skyfare">Terms of Service</Link>
        </span>
        <a href="#top">Back to top ↑</a>
      </div>
      <PreviewDialog
        open={supportDialogOpen}
        title="Concierge support is coming soon"
        message="Our 24/7 flight concierge team will be reachable via chat, phone, and email once SkyFare launches. For the earliest access, join our newsletter."
        onClose={() => setSupportDialogOpen(false)}
      />
    </footer>
  );
}
