"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page-skeleton">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/planner";

  const { isAuthenticated, login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, redirectTarget, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace(redirectTarget);
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
      router.replace(redirectTarget);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      <div className="auth-page-card">
        <div className="auth-page-header">
          <Link href="/" className="auth-page-logo">
            SKYFARE
          </Link>
          <h1>{tab === "login" ? "Sign In to Your Account" : "Create Your SkyFare Account"}</h1>
          <p>
            {tab === "login"
              ? "Access your saved trips, corporate GST profile, and AI trip planner."
              : "Start planning custom itineraries with real-time budgets and flight routes."}
          </p>
        </div>

        <div
          className="auth-modal__tabs auth-tabs"
          role="tablist"
          style={{
            display: "flex",
            width: "100%",
            borderBottom: "2px solid #e2e8f0",
            marginTop: "18px",
            marginBottom: "24px",
            gap: "8px",
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={`auth-tab ${tab === "login" ? "is-active" : ""}`}
            style={{
              flex: "1 1 0%",
              padding: "11px 16px",
              textAlign: "center",
              fontWeight: tab === "login" ? 700 : 600,
              fontSize: "14.5px",
              color: tab === "login" ? "#0d5edb" : "#64748b",
              background: "transparent",
              border: "none",
              borderBottom: tab === "login" ? "2.5px solid #0d5edb" : "2.5px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => {
              setTab("login");
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={`auth-tab ${tab === "register" ? "is-active" : ""}`}
            style={{
              flex: "1 1 0%",
              padding: "11px 16px",
              textAlign: "center",
              fontWeight: tab === "register" ? 700 : 600,
              fontSize: "14.5px",
              color: tab === "register" ? "#0d5edb" : "#64748b",
              background: "transparent",
              border: "none",
              borderBottom: tab === "register" ? "2.5px solid #0d5edb" : "2.5px solid transparent",
              marginBottom: "-2px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onClick={() => {
              setTab("register");
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="auth-error-banner" role="alert">
            <Icon name="shield" size={16} />
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
              className="button button--primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In & Continue"}
              <Icon name="arrow-right" size={18} />
            </button>
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
                <span>Mobile Number</span>
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
                <span>Company Name (Optional)</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp Ltd"
                />
              </label>

              <label className="auth-field">
                <span>Corporate GSTIN (Optional)</span>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </label>
            </div>

            <button
              type="submit"
              className="button button--primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account & Continue"}
              <Icon name="arrow-right" size={18} />
            </button>
          </form>
        )}

        <div className="auth-page-footer">
          <Link href="/" className="auth-page-back-link">
            Back to SkyFare Home
          </Link>
        </div>
      </div>
    </div>
  );
}
