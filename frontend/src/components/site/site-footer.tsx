"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/icon";
import { PreviewDialog } from "@/components/ui/preview-dialog";

export function SiteFooter() {
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);

  function handleNewsletterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterMessage(
      "Newsletter sign-up is not connected in this preview; your email was not saved.",
    );
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link href="/" className="wordmark wordmark--light">
            SKYFARE
          </Link>
          <span className="iata-badge">DESIGN PREVIEW</span>
          <p>
            A considered flight-booking experience, designed for personal and
            corporate travel.
          </p>
          <span className="site-footer__note">
            Illustrative interface only. No bookings or fares are live.
          </span>
        </div>

        <div className="site-footer__column">
          <h2>Explore</h2>
          <Link href="/#search">Search flights</Link>
          <Link href="/#destinations">Popular destinations</Link>
          <Link href="/#why-skyfare">Why SkyFare</Link>
        </div>

        <div className="site-footer__column">
          <h2>Travel tools</h2>
          <Link href="/#search">Plan a route</Link>
          <Link href="/#membership">Membership preview</Link>
          <Link href="/#newsletter">Travel updates</Link>
        </div>

        <div className="site-footer__column">
          <h2>Information</h2>
          <Link href="/#why-skyfare">About SkyFare</Link>
          <Link href="/#preview-disclosure">Preview disclosure</Link>
          <button
            type="button"
            className="site-footer__link-button"
            onClick={() => setSupportDialogOpen(true)}
          >
            Help &amp; support
          </button>
        </div>

        <div id="newsletter" className="site-footer__newsletter">
          <h2>Stay in the know</h2>
          <p>Receive occasional product and travel updates.</p>
          <form onSubmit={handleNewsletterSubmit}>
            <label className="sr-only" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Your email address"
              autoComplete="email"
              required
            />
            <button type="submit" className="button button--primary button--small">
              Join
              <Icon name="arrow-right" size={16} />
            </button>
          </form>
          {newsletterMessage && (
            <p className="form-feedback" role="status">
              {newsletterMessage}
            </p>
          )}
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© SkyFare</span>
        <span id="preview-disclosure">
          Demo interface · No live inventory, bookings, or transactions
        </span>
        <a href="#top">Back to top ↑</a>
      </div>
      <PreviewDialog
        open={supportDialogOpen}
        title="Support details are not connected"
        message="This preview does not have a live support channel. Contact information will be added before launch."
        onClose={() => setSupportDialogOpen(false)}
      />
    </footer>
  );
}
