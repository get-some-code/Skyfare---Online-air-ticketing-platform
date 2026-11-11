export type DestinationCategory =
  | "Domestic Hubs"
  | "International Charters"
  | "Coastal Retreats";

export interface AirportFixture {
  code: string;
  city: string;
  airport: string;
}

export interface DestinationFixture {
  code: string;
  city: string;
  subtitle: string;
  category: DestinationCategory;
  fareInr: number;
  fareUsd: number;
  tag?: string;
  image: string;
}

export interface BenefitFixture {
  title: string;
  description: string;
  icon: "badge" | "spark" | "receipt" | "support";
}

export const airports: AirportFixture[] = [
  { code: "CCU", city: "Kolkata", airport: "Netaji Subhash Chandra Bose Intl" },
  { code: "DEL", city: "New Delhi", airport: "Indira Gandhi International" },
  { code: "BOM", city: "Mumbai", airport: "Chhatrapati Shivaji Maharaj Intl" },
  { code: "BLR", city: "Bengaluru", airport: "Kempegowda International" },
  { code: "GOI", city: "Goa", airport: "Manohar International" },
  { code: "DXB", city: "Dubai", airport: "Dubai International Airport" },
];

export const destinations: DestinationFixture[] = [
  {
    code: "CCU",
    city: "Kolkata",
    subtitle: "City of Joy & Heritage",
    category: "Domestic Hubs",
    fareInr: 4250,
    fareUsd: 89,
    tag: "-15% Today",
    image: "/images/dest-ccu.jpg",
  },
  {
    code: "DEL",
    city: "New Delhi",
    subtitle: "Capital Hub & Diplomacy",
    category: "Domestic Hubs",
    fareInr: 3950,
    fareUsd: 75,
    tag: "Executive Shuttles",
    image: "/images/dest-del.jpg",
  },
  {
    code: "BOM",
    city: "Mumbai",
    subtitle: "Financial Capital of India",
    category: "Domestic Hubs",
    fareInr: 4890,
    fareUsd: 92,
    tag: "Direct High-Frequency",
    image: "/images/dest-bom.jpg",
  },
  {
    code: "BLR",
    city: "Bengaluru",
    subtitle: "Silicon Valley of the East",
    category: "Domestic Hubs",
    fareInr: 4500,
    fareUsd: 84,
    image: "/images/dest-blr.jpg",
  },
  {
    code: "GOI",
    city: "Goa",
    subtitle: "Coastal Retreat & Sunshine",
    category: "Coastal Retreats",
    fareInr: 3600,
    fareUsd: 68,
    image: "/images/dest-goi.jpg",
  },
  {
    code: "DXB",
    city: "Dubai",
    subtitle: "Global Luxury & Innovation",
    category: "International Charters",
    fareInr: 18900,
    fareUsd: 240,
    tag: "Global Hub",
    image: "/images/dest-dxb.jpg",
  },
];

export const benefits: BenefitFixture[] = [
  {
    title: "Best Fares Guaranteed",
    description:
      "Direct algorithmic aggregation from 500+ commercial carriers and private operators with zero hidden markup fees or surge baggage costs.",
    icon: "badge",
  },
  {
    title: "Easy & Fast Booking",
    description:
      "Streamlined 3-step executive checkout. Generate confirmed IATA e-tickets in seconds with automated synchronisation to your calendar and Apple Wallet.",
    icon: "spark",
  },
  {
    title: "Corporate GST Engine",
    description:
      "Built-in corporate compliance. Get compliant B2B tax invoices, centralised team expense management, and instant GSTR-2B credit claims.",
    icon: "receipt",
  },
  {
    title: "24/7 Dedicated Support",
    description:
      "Senior flight concierges at your service around the clock for re-routings, delay mitigation, emergency charters, and VIP ground transfers.",
    icon: "support",
  },
];

export const destinationCategories = [
  "All Routes",
  "Domestic Hubs",
  "International Charters",
  "Coastal Retreats",
] as const;
