import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { CurrencyProvider } from "@/components/site/currency-context";
import { TrustBar } from "@/components/site/demo-notice";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SkyFare | Premium Flight Booking & Corporate Travel",
    template: "%s | SkyFare",
  },
  description:
    "SkyFare — Discover scheduled commercial flights and private corporate charters. Compare executive fares with guaranteed pricing and automated corporate GST reconciliation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <CurrencyProvider>
            <SiteHeader />
            <TrustBar />
            <div className="app-content">{children}</div>
            <SiteFooter />
            <AuthModal />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
