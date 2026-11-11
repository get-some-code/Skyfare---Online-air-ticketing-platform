import type { Metadata } from "next";
import { CurrencyProvider } from "@/components/site/currency-context";
import { DemoNotice } from "@/components/site/demo-notice";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SkyFare | Thoughtful travel, simply planned",
    template: "%s | SkyFare",
  },
  description:
    "Explore the SkyFare flight-booking experience. This development preview does not show live fares or availability.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <CurrencyProvider>
          <SiteHeader />
          <DemoNotice />
          <div className="app-content">{children}</div>
          <SiteFooter />
        </CurrencyProvider>
      </body>
    </html>
  );
}
