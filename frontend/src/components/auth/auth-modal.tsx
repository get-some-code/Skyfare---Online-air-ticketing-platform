"use client";

import React, { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";

export function AuthModal() {
  const { authModalOpen, authModalTab, closeAuthModal, login, register } = useAuth();
  const [overrideTab, setOverrideTab] = useState<"login" | "register" | null>(null);
  const tab = overrideTab ?? authModalTab;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");

  const handleClose = useCallback(() => {
    setOverrideTab(null);
    setError(null);
    closeAuthModal();
  }, [closeAuthModal]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && authModalOpen) {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authModalOpen, handleClose]);

  if (!authModalOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        company_name: companyName.trim() || undefined,
        gstin: gstin.trim() || undefined,
      });
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setCompanyName("");
      setGstin("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="auth-modal">
        <button
          type="button"
          className="auth-modal__close"
          onClick={handleClose}
          aria-label="Close dialog"
        >
          <Icon name="x" size={18} />
        </button>

        <div className="auth-modal__header">
          <div className="auth-modal__brand">
            <Icon name="plane" size={20} />
            <span>SKYFARE EXECUTIVE</span>
          </div>
          <h2 id="auth-modal-title">
            {tab === "login" ? "Sign In to Your Account" : "Create SkyFare Account"}
          </h2>
          <p>
            {tab === "login"
              ? "Access your bookings, Privilege Club tier, and saved travelers."
              : "Unlock executive fares, automated corporate GST invoices, and lounge perks."}
          </p>

          <div className="auth-modal__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "login"}
              className={`auth-tab${tab === "login" ? " is-active" : ""}`}
              onClick={() => {
                setOverrideTab("login");
                setError(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "register"}
              className={`auth-tab${tab === "register" ? " is-active" : ""}`}
              onClick={() => {
                setOverrideTab("register");
                setError(null);
              }}
            >
              Create Account
            </button>
          </div>
        </div>

        {error && (
          <div className="auth-modal__error" role="alert">
            <Icon name="spark" size={16} />
            <span>{error}</span>
          </div>
        )}

        {tab === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="auth-field">
              <span>Email Address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                autoFocus
              />
            </label>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="button button--primary auth-submit"
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>

            <div className="auth-footer-prompt">
              <span>Don&apos;t have an account?</span>{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setOverrideTab("register");
                  setError(null);
                }}
              >
                Sign Up
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <label className="auth-field">
              <span>Full Name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                autoComplete="name"
                autoFocus
              />
            </label>

            <div className="auth-field-row">
              <label className="auth-field">
                <span>Email Address</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </label>

              <label className="auth-field">
                <span>Phone (optional)</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  autoComplete="tel"
                />
              </label>
            </div>

            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>

            <div className="auth-field-row">
              <label className="auth-field">
                <span>Company Name (optional)</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp Ltd"
                />
              </label>

              <label className="auth-field">
                <span>GSTIN (optional)</span>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button button--primary auth-submit"
            >
              {loading ? "Creating Account…" : "Join SkyFare"}
            </button>

            <div className="auth-footer-prompt">
              <span>Already a member?</span>{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setOverrideTab("login");
                  setError(null);
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
