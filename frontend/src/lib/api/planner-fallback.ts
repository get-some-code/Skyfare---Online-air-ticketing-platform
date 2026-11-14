import type {
  DayPlan,
  PlannerChatResponse,
  PlannerGenerateResponse,
  TripPlan,
  TripState,
} from "./planner";

// Airport code mapping for prominent domestic & international travel hubs
const IATA_MAP: Record<string, string> = {
  delhi: "DEL",
  "new delhi": "DEL",
  kolkata: "CCU",
  mumbai: "BOM",
  bengaluru: "BLR",
  bangalore: "BLR",
  chennai: "MAA",
  hyderabad: "HYD",
  manali: "KUU",
  kullu: "KUU",
  chandigarh: "IXC",
  shimla: "SLV",
  goa: "GOI",
  "leh ladakh": "IXL",
  leh: "IXL",
  ladakh: "IXL",
  srinagar: "SXR",
  kashmir: "SXR",
  jaipur: "JAI",
  kochi: "COK",
  kerala: "COK",
  germany: "FRA",
  munich: "MUC",
  frankfurt: "FRA",
  berlin: "BER",
  switzerland: "ZRH",
  zurich: "ZRH",
  geneva: "GVA",
  dubai: "DXB",
  uae: "DXB",
  london: "LHR",
  uk: "LHR",
  paris: "CDG",
  france: "CDG",
  singapore: "SIN",
  bangkok: "BKK",
  thailand: "BKK",
  tokyo: "HND",
  japan: "HND",
  bali: "DPS",
  indonesia: "DPS",
};

export function localPlannerChatFallback(
  message: string,
  currentState: TripState,
): PlannerChatResponse {
  const m = message.toLowerCase().trim();
  const updated: TripState = { ...currentState };

  // 1. Days extraction
  const dayMatch = m.match(/\b(\d{1,2})\s*(?:days?|nights?)\b/i);
  if (dayMatch) {
    updated.days = Math.min(14, Math.max(1, parseInt(dayMatch[1], 10)));
  }

  // 2. Budget tier extraction
  if (m.includes("budget") || m.includes("cheap") || m.includes("economy")) {
    updated.budget_tier = "budget";
  } else if (m.includes("luxury") || m.includes("premium")) {
    updated.budget_tier = "premium";
  } else if (m.includes("mid") || m.includes("standard")) {
    updated.budget_tier = "mid-range";
  }

  // 3. Food preference extraction
  if (m.includes("jain")) {
    updated.food_preference = "jain";
  } else if (m.includes("veg") && !m.includes("non-veg")) {
    updated.food_preference = "vegetarian";
  } else if (m.includes("halal")) {
    updated.food_preference = "halal";
  } else if (m.includes("non-veg") || m.includes("non vegetarian")) {
    updated.food_preference = "non-vegetarian";
  }

  // 4. Group type extraction
  if (m.includes("solo")) {
    updated.group_type = "solo";
  } else if (m.includes("couple") || m.includes("partner") || m.includes("honeymoon")) {
    updated.group_type = "couple";
  } else if (m.includes("family") || m.includes("kids")) {
    updated.group_type = "family";
  } else if (m.includes("friends") || m.includes("buddies") || m.includes("group")) {
    updated.group_type = "friends";
  }

  // 5. Pace extraction
  if (m.includes("relaxed") || m.includes("slow")) {
    updated.pace = "relaxed";
  } else if (m.includes("packed") || m.includes("fast") || m.includes("intense")) {
    updated.pace = "packed";
  } else if (m.includes("balanced") || m.includes("moderate")) {
    updated.pace = "balanced";
  }

  // 6. Origin city extraction
  const fromMatch = m.match(/\bfrom\s+([a-zA-Z\s]+?)(?:,|$|\bfor\b|\bwith\b|\bin\b|\bto\b)/i);
  if (fromMatch) {
    const rawOrigin = fromMatch[1].trim();
    if (rawOrigin.length > 2) {
      updated.origin_city = rawOrigin.charAt(0).toUpperCase() + rawOrigin.slice(1);
    }
  }

  // Direct origin selection from chips
  const commonOrigins = ["kolkata", "delhi", "new delhi", "mumbai", "bengaluru", "bangalore", "chennai", "hyderabad", "pune", "ahmedabad"];
  if (!updated.origin_city && commonOrigins.includes(m)) {
    updated.origin_city = m.charAt(0).toUpperCase() + m.slice(1);
  }

  // 7. Destination extraction
  if (!updated.destination) {
    if (m !== "start trip plan" && m !== "retry" && m !== "start over" && !commonOrigins.includes(m)) {
      // If chips clicked or free text entered
      const cleanDest = message.replace(/^to\s+/i, "").replace(/^visit\s+/i, "").trim();
      if (cleanDest.length > 1 && !cleanDest.match(/^\d+\s*days?/i) && !cleanDest.toLowerCase().startsWith("from ")) {
        updated.destination = cleanDest;
      }
    }
  }

  // Classify domestic vs international
  if (updated.destination) {
    const destLower = updated.destination.toLowerCase();
    const internationalKeywords = [
      "germany", "switzerland", "dubai", "uae", "london", "uk", "paris", "france",
      "singapore", "thailand", "bangkok", "bali", "indonesia", "japan", "tokyo",
      "italy", "rome", "spain", "barcelona", "amsterdam", "usa", "canada", "vietnam",
    ];
    if (internationalKeywords.some((k) => destLower.includes(k))) {
      updated.trip_type = "international";
    } else {
      updated.trip_type = "domestic";
    }
  }

  // Compute missing required fields
  const missing: string[] = [];
  if (!updated.destination) missing.push("destination");
  if (!updated.origin_city) missing.push("origin_city");
  if (!updated.days) missing.push("days");
  if (!updated.budget_tier) missing.push("budget_tier");

  // Determine readiness
  const isReady = missing.length === 0;

  // Compute progress percent
  const totalFields = 5;
  const filledCount = [
    updated.destination,
    updated.origin_city,
    updated.days,
    updated.budget_tier,
    updated.group_type || updated.food_preference,
  ].filter(Boolean).length;
  const progressPercent = isReady ? 100 : Math.max(15, Math.min(90, Math.round((filledCount / totalFields) * 100)));

  // Formulation of next question and tappable chips
  let question = "Where would you like to travel?";
  let chips = ["Manali", "Germany", "Goa", "Leh Ladakh", "Switzerland", "Dubai"];

  if (!updated.destination) {
    question = "Where would you like to travel?";
    chips = ["Manali", "Germany", "Goa", "Leh Ladakh", "Switzerland", "Dubai"];
  } else if (!updated.origin_city) {
    question = `Which city will you be departing from for ${updated.destination}?`;
    chips = ["Kolkata", "New Delhi", "Mumbai", "Bengaluru", "Chennai"];
  } else if (!updated.days) {
    question = `How many days are you planning for your ${updated.destination} trip?`;
    chips = ["3 Days", "5 Days", "7 Days", "10 Days"];
  } else if (!updated.budget_tier) {
    question = "What is your preferred travel style and budget level?";
    chips = ["Budget", "Mid-range", "Premium"];
  } else if (isReady) {
    question = `Your trip outline to ${updated.destination} is ready. Would you like to build your complete day-by-day itinerary and itemized INR budget now?`;
    chips = ["Generate Trip Plan", "Relaxed Pace", "Vegetarian Food", "Solo Trip"];
  }

  return {
    state: updated,
    question,
    chips,
    progress_percent: progressPercent,
    is_ready_to_generate: isReady,
    missing_fields: missing,
  };
}

export function localGeneratePlanFallback(state: TripState): PlannerGenerateResponse {
  const dest = state.destination || "Manali";
  const daysCount = state.days || 5;
  const origin = state.origin_city || "New Delhi";
  const budget = state.budget_tier || "mid-range";
  const food = state.food_preference || "vegetarian";
  const isVeg = food === "vegetarian" || food === "jain";
  const isInternational = state.trip_type === "international" || isInternationalDest(dest);

  const plan = isInternational
    ? buildInternationalPlan(dest, daysCount, origin, budget, isVeg)
    : buildDomesticPlan(dest, daysCount, origin, budget, isVeg);

  return {
    plan,
    provider: "skyfare-edge",
  };
}

function isInternationalDest(dest: string): boolean {
  const d = dest.toLowerCase();
  return [
    "germany", "switzerland", "dubai", "uae", "london", "uk", "paris", "france",
    "singapore", "thailand", "bangkok", "bali", "indonesia", "japan", "tokyo",
    "italy", "rome", "spain", "barcelona", "amsterdam", "usa", "canada", "vietnam",
  ].some((k) => d.includes(k));
}

function resolveIata(cityOrPlace: string, fallback: string): string {
  const clean = cityOrPlace.toLowerCase().trim();
  for (const [k, v] of Object.entries(IATA_MAP)) {
    if (clean.includes(k)) return v;
  }
  return fallback;
}

function buildDomesticPlan(
  dest: string,
  days: number,
  origin: string,
  budget: string,
  isVeg: boolean,
): TripPlan {
  const origIata = resolveIata(origin, "DEL");
  const destIata = resolveIata(dest, "IXC");
  const isManali = dest.toLowerCase().includes("manali");
  const isGoa = dest.toLowerCase().includes("goa");
  const isLadakh = dest.toLowerCase().includes("leh") || dest.toLowerCase().includes("ladakh");

  const today = new Date();
  const departDate = new Date(today.getTime() + 28 * 86400000).toISOString().split("T")[0];
  const returnDate = new Date(today.getTime() + (28 + days) * 86400000).toISOString().split("T")[0];

  const generatedDays: DayPlan[] = [];
  for (let i = 1; i <= days; i++) {
    generatedDays.push(createDomesticDay(dest, i, isVeg, isManali, isGoa, isLadakh));
  }

  const multiplier = budget === "premium" ? 2.2 : budget === "budget" ? 0.65 : 1.0;
  const baseTotal = days * 4200 * multiplier;

  return {
    overview: `Experience the breathtaking landscapes and premier cultural landmarks of ${dest}. Perfectly tailored for Indian travellers seeking an authentic, seamless journey from ${origin}.`,
    best_time: isLadakh
      ? "May to September (accessible high-altitude mountain passes)"
      : isGoa
      ? "November to February (pleasant coastal weather and sunny beaches)"
      : "March to June and September to November (crisp mountain air and clear skies)",
    arrival: {
      recommended: isManali
        ? "Chandigarh International Airport (IXC) / Bhuntar Kullu (KUU)"
        : isGoa
        ? "Goa Dabolim Airport (GOI) or Mopa Airport (GOX)"
        : isLadakh
        ? "Kushok Bakula Rimpochee Airport, Leh (IXL)"
        : `${destIata} Hub`,
      reason: isManali
        ? "Chandigarh offers reliable widebody connections and scenic 4-lane highway drive via Kiratpur-Nerchowk expressway, avoiding weather cancellations."
        : isLadakh
        ? "Direct morning flights with mandatory 48-hour acclimatisation."
        : "Convenient direct hub connections with minimal transit overhead.",
      alternatives: isManali
        ? ["Bhuntar Kullu Airport (KUU) - 50 km from Manali", "New Delhi (DEL) - Overnight Volvo bus link"]
        : ["Train to nearest junction", "Private intercity chauffeur"],
      onward_transport: [
        {
          mode: "Prepaid Airport Cab / Private SUV",
          duration: isManali ? "7 hours via NH-21" : "45 minutes",
          cost_inr: isManali ? "₹5,500 - ₹7,000" : "₹1,200 - ₹1,800",
        },
        {
          mode: "HRTC Volvo Luxury Coach",
          duration: isManali ? "8.5 hours" : "1.5 hours",
          cost_inr: isManali ? "₹1,250 - ₹1,650" : "₹400 - ₹600",
        },
      ],
    },
    route_summary: `${origin} (${origIata}) → ${dest} (${destIata}) logistics corridor with verified road conditions and scenic transit stops.`,
    days: generatedDays,
    budget: {
      low: {
        local_travel: `₹${Math.round(800 * days * 0.7).toLocaleString("en-IN")}`,
        stay: `₹${Math.round(1800 * days * 0.7).toLocaleString("en-IN")}`,
        food: `₹${Math.round(900 * days * 0.7).toLocaleString("en-IN")}`,
        sightseeing: `₹${Math.round(500 * days * 0.7).toLocaleString("en-IN")}`,
        activities: `₹${Math.round(800 * days * 0.7).toLocaleString("en-IN")}`,
        misc: `₹${Math.round(400 * days * 0.7).toLocaleString("en-IN")}`,
        total: `₹${Math.round(baseTotal * 0.7).toLocaleString("en-IN")}`,
      },
      medium: {
        local_travel: `₹${Math.round(1400 * days).toLocaleString("en-IN")}`,
        stay: `₹${Math.round(3500 * days).toLocaleString("en-IN")}`,
        food: `₹${Math.round(1500 * days).toLocaleString("en-IN")}`,
        sightseeing: `₹${Math.round(900 * days).toLocaleString("en-IN")}`,
        activities: `₹${Math.round(1500 * days).toLocaleString("en-IN")}`,
        misc: `₹${Math.round(700 * days).toLocaleString("en-IN")}`,
        total: `₹${Math.round(baseTotal).toLocaleString("en-IN")}`,
      },
      high: {
        local_travel: `₹${Math.round(2600 * days * 1.6).toLocaleString("en-IN")}`,
        stay: `₹${Math.round(7500 * days * 1.6).toLocaleString("en-IN")}`,
        food: `₹${Math.round(2800 * days * 1.6).toLocaleString("en-IN")}`,
        sightseeing: `₹${Math.round(1800 * days * 1.6).toLocaleString("en-IN")}`,
        activities: `₹${Math.round(3200 * days * 1.6).toLocaleString("en-IN")}`,
        misc: `₹${Math.round(1400 * days * 1.6).toLocaleString("en-IN")}`,
        total: `₹${Math.round(baseTotal * 2.2).toLocaleString("en-IN")}`,
      },
      approx_flights_inr: `₹${(6500 * multiplier).toFixed(0)} - ₹${(12000 * multiplier).toFixed(0)}`,
    },
    indian_traveller: {
      visa_or_permits: isManali
        ? "Rohtang Pass Green Permit required via District Administration portal. Atal Tunnel to Sissu requires no permit."
        : isLadakh
        ? "Inner Line Permit (ILP) mandatory for Nubra Valley, Pangong Tso, and Hanle (apply at lahdclehpermit.in)."
        : "No special permits required for Indian citizens. Valid government photo ID (Aadhaar or Voter ID) required for check-in.",
      money: "UPI (Google Pay, PhonePe, Paytm) accepted at 90% of shops and cafes. Keep ₹5,000 - ₹8,000 cash for remote high-altitude checkposts, taxis, and village stalls.",
      connectivity: isLadakh
        ? "Only postpaid SIM cards work in Ladakh. Jio and Airtel postpaid provide reliable 4G in Leh and Keylong."
        : "Jio and Airtel provide excellent 4G/5G coverage in towns. BSNL works best in high mountain valleys.",
      power: "Standard Indian 3-pin and 2-pin Type C/D plugs (230V, 50Hz). Bring a high-capacity power bank due to rapid battery depletion in colder temperatures.",
      food: isVeg
        ? "Plentiful pure vegetarian, North Indian, Jain, and Himachali Dham options available throughout the route."
        : "Wide selection of local trout fish, Himachali mutton curry, Tibetan momos, and multi-cuisine restaurants.",
      safety: isLadakh || isManali
        ? "Acclimatise on day 1. Stay hydrated, avoid heavy physical exertion initially, and carry Diamox or consult a physician for AMS prevention."
        : "Standard tourist safety rules apply. Avoid unlicenced water sports and book verified taxi union vehicles.",
    },
    seasonal_advisory: [
      "Carry layered woollens and thermal inners; mountain temperatures drop sharply after sunset.",
      "Check live road accessibility and snowfall advisories on the state transport portal before crossing mountain passes.",
    ],
    flight_search: {
      origin_iata: origIata,
      destination_iata: destIata,
      depart_date: departDate,
      return_date: returnDate,
      passengers: 1,
    },
    disclaimer: "Details are AI-generated estimates. Please verify opening hours, permits, visa requirements, and prices before booking.",
  };
}

function createDomesticDay(
  dest: string,
  dayNum: number,
  isVeg: boolean,
  isManali: boolean,
  isGoa: boolean,
  isLadakh: boolean,
): DayPlan {
  if (isManali) {
    if (dayNum === 1) {
      return {
        day: 1,
        title: "Arrival, Acclimatisation & Old Manali Heritage Walk",
        stops: [
          {
            time: "10:30 AM",
            place: "Hadimba Devi Temple & Dhungri Van Vihar",
            type: "Heritage & Nature",
            what_to_do: "Explore the 1553 AD pagoda-style wooden temple nestled in towering cedar and deodar forests.",
            duration: "1.5 hours",
            cost_inr: "Free entry",
            tip: "Visit early morning to beat the tourist crowds and witness traditional wooden architecture.",
          },
          {
            time: "02:30 PM",
            place: "Old Manali Village & Manu Temple Trail",
            type: "Culture & Viewpoints",
            what_to_do: "Stroll cobblestone alleys lined with apple orchards, Bohemian artisan shops, and vibrant bakeries.",
            duration: "2 hours",
            cost_inr: "Free",
            tip: "Wear comfortable walking shoes for the gentle uphill trail to Manu Temple.",
          },
        ],
        food: [
          {
            name: "The Lazy Dog Lounge, Old Manali",
            cuisine: "Continental, Himachali & Trout",
            veg_friendly: true,
            cost_per_person_inr: "₹600 - ₹900",
          },
          {
            name: "Drifters' Cafe, Manu Temple Road",
            cuisine: "Cafe, Mediterranean & Comfort Food",
            veg_friendly: true,
            cost_per_person_inr: "₹450 - ₹700",
          },
        ],
        transport: "Private auto-rickshaw or local taxi for local transfers",
      };
    }
    if (dayNum === 2) {
      return {
        day: 2,
        title: "Atal Tunnel Marvel & Lahaul Valley Sissu Waterfalls",
        stops: [
          {
            time: "08:30 AM",
            place: "Atal Tunnel (9.02 km Engineering Marvel at 10,040 ft)",
            type: "Scenic Mountain Pass",
            what_to_do: "Drive through the world's longest single-tube highway tunnel above 10,000 feet connecting Kullu to Lahaul.",
            duration: "45 minutes",
            cost_inr: "Toll included in cab fare",
            tip: "Keep headlights on and adhere strictly to the 60 km/h speed limit.",
          },
          {
            time: "11:00 AM",
            place: "Sissu Waterfall & Chandra River Valley",
            type: "Waterfalls & Landscapes",
            what_to_do: "Hike to the cascading glacier-fed Sissu Falls across the hanging bridge and photograph the rugged trans-Himalayan cliffs.",
            duration: "2.5 hours",
            cost_inr: "₹50 environmental fee",
            tip: "Carry an extra windcheater; crosswinds across the Chandra riverbed are freezing.",
          },
        ],
        food: [
          {
            name: "Palhamo Dhaba, Sissu",
            cuisine: "Tibetan Momos, Thukpa & Masala Chai",
            veg_friendly: true,
            cost_per_person_inr: "₹200 - ₹350",
          },
          {
            name: "Johnson's Cafe, Circuit House Road",
            cuisine: "Woodfired Pizza & Fresh Bakes",
            veg_friendly: true,
            cost_per_person_inr: "₹700 - ₹1,100",
          },
        ],
        transport: "Book an all-wheel-drive local commercial taxi (approx ₹3,500 - ₹4,500 for the day)",
      };
    }
    return {
      day: dayNum,
      title: `Solang Valley Adventure & Jogini Waterfall Trek (Day ${dayNum})`,
      stops: [
        {
          time: "09:00 AM",
          place: "Solang Valley Alpine Meadow",
          type: "Adventure Sports",
          what_to_do: "Take the cable car gondola to Mt. Phatru for panoramic snow-peak views and paragliding.",
          duration: "3 hours",
          cost_inr: "₹750 for ropeway gondola",
          tip: "Negotiate paragliding directly at the government counter to avoid unauthorized touts.",
        },
        {
          time: "03:00 PM",
          place: "Jogini Waterfalls Trail via Vashisht",
          type: "Nature Trek",
          what_to_do: "Hike along apple orchards and mountain streams to the two-tier Jogini cascade, followed by natural sulphur hot springs in Vashisht.",
          duration: "2 hours",
          cost_inr: "Free",
          tip: "Carry your own water bottle and trekking pole for the stepped trail.",
        },
      ],
      food: [
        {
          name: "Cafe 1947, Near Nehru Kund",
          cuisine: "Italian & Riverside Bakes",
          veg_friendly: true,
          cost_per_person_inr: "₹650 - ₹950",
        },
        {
          name: "Mayur Restaurant, Mall Road",
          cuisine: "Pure North Indian Vegetarian & Thali",
          veg_friendly: true,
          cost_per_person_inr: "₹350 - ₹550",
        },
      ],
      transport: "Local union cab or scooter rental",
    };
  }

  if (isGoa) {
    return {
      day: dayNum,
      title: dayNum === 1 ? "North Goa Coastal Heritage & Sunset Forts" : "South Goa Serene Beaches & Spice Plantations",
      stops: [
        {
          time: "10:00 AM",
          place: dayNum === 1 ? "Fort Aguada & Sinquerim Lighthouse" : "Basilica of Bom Jesus, Old Goa",
          type: "Heritage & Coastal Views",
          what_to_do: dayNum === 1 ? "Explore 17th-century Portuguese fortress overlooking the Arabian Sea." : "Admire Baroque architecture and UNESCO World Heritage sanctuary.",
          duration: "2 hours",
          cost_inr: "₹50 entry",
          tip: "Carry sun protection and light cotton attire.",
        },
        {
          time: "04:30 PM",
          place: dayNum === 1 ? "Vagator Hilltop Sunset Point" : "Palolem Beach Crescent",
          type: "Scenic Beach Viewpoint",
          what_to_do: "Witness the sunset across dramatic red laterite cliffs.",
          duration: "2 hours",
          cost_inr: "Free",
          tip: "Arrive by 05:00 PM for the best cliffside photography.",
        },
      ],
      food: [
        {
          name: "Gunpowder, Assagao",
          cuisine: "Coastal South Indian & Veg Delicacies",
          veg_friendly: true,
          cost_per_person_inr: "₹700 - ₹1,100",
        },
        {
          name: "Fisherman's Wharf",
          cuisine: "Goan Curry & Multi-Cuisine",
          veg_friendly: true,
          cost_per_person_inr: "₹800 - ₹1,300",
        },
      ],
      transport: "Self-drive car or scooter rental",
    };
  }

  if (isLadakh) {
    return {
      day: dayNum,
      title: dayNum === 1 ? "Leh Acclimatisation & Shanti Stupa" : "Nubra Valley via Khardung La Pass",
      stops: [
        {
          time: "10:00 AM",
          place: dayNum === 1 ? "Leh Palace & Central Market" : "Khardung La Pass (17,982 FT)",
          type: "High-Altitude Pass & Culture",
          what_to_do: dayNum === 1 ? "Gentle walking tour through historic mud-brick stupas." : "Cross one of the highest motorable passes in the world.",
          duration: "2 hours",
          cost_inr: "Free / ILP Permit",
          tip: "Do not spend more than 20 minutes at the top of the pass due to low oxygen.",
        },
        {
          time: "03:30 PM",
          place: dayNum === 1 ? "Shanti Stupa Sunset Ridge" : "Hunder Sand Dunes & Bactrian Camels",
          type: "Panoramic Viewpoint",
          what_to_do: "Experience 360-degree views of Leh valley and the Zanskar mountain range.",
          duration: "1.5 hours",
          cost_inr: "Free",
          tip: "Dress in multiple warm windproof layers.",
        },
      ],
      food: [
        {
          name: "The Tibetan Kitchen, Leh",
          cuisine: "Tibetan Momos, Thukpa & Ladakhi Stew",
          veg_friendly: true,
          cost_per_person_inr: "₹450 - ₹750",
        },
        {
          name: "Bon Appetit, Changspa",
          cuisine: "Continental & Organic Mountain Cuisine",
          veg_friendly: true,
          cost_per_person_inr: "₹650 - ₹1,000",
        },
      ],
      transport: "Local Leh Taxi Union 4x4 SUV",
    };
  }

  // Generic Domestic Day fallback
  return {
    day: dayNum,
    title: `Exploring Iconic Highlights & Local Gastronomy of ${dest} (Day ${dayNum})`,
    stops: [
      {
        time: "09:30 AM",
        place: `${dest} Main Cultural Landmark & Old Quarter`,
        type: "Heritage Sightseeing",
        what_to_do: "Discover the region's signature architectural marvels, historic corridors, and artisan quarters.",
        duration: "2.5 hours",
        cost_inr: "₹100 - ₹300 entry fee",
        tip: "Hire a certified local ASI guide for authentic historical context.",
      },
      {
        time: "02:30 PM",
        place: `${dest} Scenic Waterfront & Sunset Ridge`,
        type: "Viewpoints & Nature",
        what_to_do: "Relax along scenic promenades, photography viewpoints, and bustling local markets.",
        duration: "2 hours",
        cost_inr: "Free",
        tip: "Ideal time for golden hour photography.",
      },
    ],
    food: [
      {
        name: `Grand ${dest} Traditional Kitchen`,
        cuisine: isVeg ? "Authentic Regional Pure Veg & Thali" : "Regional Specialties & Multi-Cuisine",
        veg_friendly: true,
        cost_per_person_inr: "₹450 - ₹750",
      },
      {
        name: `The Royal Spice Haven`,
        cuisine: "North Indian & Local Delicacies",
        veg_friendly: true,
        cost_per_person_inr: "₹550 - ₹900",
      },
    ],
    transport: "Prepaid taxi or app-based cab",
  };
}

function buildInternationalPlan(
  dest: string,
  days: number,
  origin: string,
  budget: string,
  isVeg: boolean,
): TripPlan {
  const isGermany = dest.toLowerCase().includes("germany") || dest.toLowerCase().includes("munich") || dest.toLowerCase().includes("frankfurt");
  const isSwiss = dest.toLowerCase().includes("switzerland") || dest.toLowerCase().includes("zurich");
  const isDubai = dest.toLowerCase().includes("dubai") || dest.toLowerCase().includes("uae");

  const origIata = resolveIata(origin, "DEL");
  const destIata = resolveIata(dest, isGermany ? "FRA" : isSwiss ? "ZRH" : isDubai ? "DXB" : "LHR");

  const today = new Date();
  const departDate = new Date(today.getTime() + 35 * 86400000).toISOString().split("T")[0];
  const returnDate = new Date(today.getTime() + (35 + days) * 86400000).toISOString().split("T")[0];

  const generatedDays: DayPlan[] = [];
  for (let i = 1; i <= days; i++) {
    generatedDays.push(createInternationalDay(dest, i, isVeg, isGermany, isSwiss, isDubai));
  }

  const multiplier = budget === "premium" ? 2.4 : budget === "budget" ? 0.7 : 1.0;
  const baseTotal = days * 11500 * multiplier;

  return {
    overview: `An executive international itinerary across ${dest}, offering world-class infrastructure, iconic architectural monuments, and effortless connectivity for Indian passport holders.`,
    best_time: isDubai
      ? "November to March (cool desert breezes and outdoor festivals)"
      : "May to October (long daylight hours, mild temperatures, and lush alpine scenery)",
    arrival: {
      recommended: isGermany
        ? "Frankfurt Airport (FRA) or Munich Airport (MUC)"
        : isSwiss
        ? "Zurich International Airport (ZRH)"
        : isDubai
        ? "Dubai International Airport (DXB)"
        : `${destIata} International Hub`,
      reason: isGermany
        ? "FRA has high-frequency direct flights from DEL, BOM, and BLR with seamless basement ICE high-speed train connectivity."
        : isSwiss
        ? "ZRH has an integrated train station connecting directly to Lucerne and Interlaken within 70 minutes."
        : "DXB Terminal 3 offers seamless Emirates connection and direct Dubai Metro Red Line access.",
      alternatives: isGermany
        ? ["Munich Airport (MUC) for Southern Bavaria", "Berlin Brandenburg (BER)"]
        : ["Geneva (GVA)", "Basel EuroAirport (BSL)"],
      onward_transport: [
        {
          mode: isDubai ? "Dubai Metro Red Line" : "ICE High-Speed Rail / Swiss Travel Pass",
          duration: isDubai ? "25 minutes to Downtown" : "1 hour 15 minutes",
          cost_inr: isDubai ? "₹180 - ₹350 (Nol Silver Card)" : "₹2,800 - ₹4,500 (included in rail pass)",
        },
        {
          mode: "Prebooked Private Airport Chauffeur",
          duration: "40 minutes",
          cost_inr: "₹4,500 - ₹7,500",
        },
      ],
    },
    route_summary: `${origin} (${origIata}) → ${dest} (${destIata}) high-efficiency corridor with scenic rail routes and multi-lingual transit hubs.`,
    days: generatedDays,
    budget: {
      low: {
        local_travel: `₹${Math.round(2200 * days * 0.7).toLocaleString("en-IN")}`,
        stay: `₹${Math.round(5500 * days * 0.7).toLocaleString("en-IN")}`,
        food: `₹${Math.round(2500 * days * 0.7).toLocaleString("en-IN")}`,
        sightseeing: `₹${Math.round(2000 * days * 0.7).toLocaleString("en-IN")}`,
        activities: `₹${Math.round(2000 * days * 0.7).toLocaleString("en-IN")}`,
        misc: `₹${Math.round(1000 * days * 0.7).toLocaleString("en-IN")}`,
        total: `₹${Math.round(baseTotal * 0.7).toLocaleString("en-IN")}`,
      },
      medium: {
        local_travel: `₹${Math.round(3800 * days).toLocaleString("en-IN")}`,
        stay: `₹${Math.round(9500 * days).toLocaleString("en-IN")}`,
        food: `₹${Math.round(4200 * days).toLocaleString("en-IN")}`,
        sightseeing: `₹${Math.round(3500 * days).toLocaleString("en-IN")}`,
        activities: `₹${Math.round(4000 * days).toLocaleString("en-IN")}`,
        misc: `₹${Math.round(1800 * days).toLocaleString("en-IN")}`,
        total: `₹${Math.round(baseTotal).toLocaleString("en-IN")}`,
      },
      high: {
        local_travel: `₹${Math.round(7500 * days * 1.5).toLocaleString("en-IN")}`,
        stay: `₹${Math.round(22000 * days * 1.5).toLocaleString("en-IN")}`,
        food: `₹${Math.round(8500 * days * 1.5).toLocaleString("en-IN")}`,
        sightseeing: `₹${Math.round(6500 * days * 1.5).toLocaleString("en-IN")}`,
        activities: `₹${Math.round(8000 * days * 1.5).toLocaleString("en-IN")}`,
        misc: `₹${Math.round(3500 * days * 1.5).toLocaleString("en-IN")}`,
        total: `₹${Math.round(baseTotal * 2.4).toLocaleString("en-IN")}`,
      },
      approx_flights_inr: isDubai
        ? `₹${(18000 * multiplier).toFixed(0)} - ₹${(28000 * multiplier).toFixed(0)}`
        : `₹${(45000 * multiplier).toFixed(0)} - ₹${(72000 * multiplier).toFixed(0)}`,
    },
    indian_traveller: {
      visa_or_permits: isGermany || isSwiss
        ? "Schengen Visa (Type C short-stay) mandatory. Book VFS Global appointment 60-90 days in advance. Mandatory travel insurance with €30,000 emergency medical cover."
        : isDubai
        ? "Pre-arranged 30-day or 60-day UAE Tourist Visa via airline or GDRFA. Passport holders with valid US/UK visa or Green Card eligible for Visa-on-Arrival."
        : "Check specific destination embassy guidelines for Indian passport holders and ensure at least 6 months validity from departure.",
      money: "Use an Indian zero-markup forex card (Niyo Global, Scapia, Fi, or BookMyForex multi-currency card). Keep 10-15% in cash for local coin lockers and public bathrooms.",
      connectivity: "Buy an Airalo or Holafly regional eSIM before boarding, or collect a local SIM at the airport arrival terminal (Telekom/Vodafone in Europe, du/Etisalat in UAE).",
      power: isGermany || isSwiss
        ? "Europlug Type C & F (230V, 50Hz). In Switzerland, three-pin Type J is common. Carry a universal travel adapter."
        : "Type G 3-pin British plug (230V, 50Hz).",
      food: isVeg
        ? "Indian and vegetarian restaurants are widespread in major cities. Look for Indian cuisine chains (Saravanaa Bhavan, Bawarchi, Indian Curry House). Grocery stores (Rewe, Coop, Migros) stock ready-to-eat Indian meals."
        : "Halal options and international multi-cuisine are widely accessible. Many European supermarkets offer fresh sandwiches and hot rotisserie items.",
      safety: "Beware of pickpocketing in crowded tourist plazas and central train stations. Keep passport in hotel safety locker and carry digital copies on your phone.",
    },
    seasonal_advisory: [
      "Tap water across Western Europe and UAE hotels is completely safe and potable; carry a refillable thermal flask.",
      "Book top attraction tickets (Burj Khalifa, Neuschwanstein Castle, Jungfraujoch) online 2-3 weeks in advance to avoid sold-out entry slots.",
    ],
    flight_search: {
      origin_iata: origIata,
      destination_iata: destIata,
      depart_date: departDate,
      return_date: returnDate,
      passengers: 1,
    },
    disclaimer: "Details are AI-generated estimates. Please verify opening hours, permits, visa requirements, and prices before booking.",
  };
}

function createInternationalDay(
  dest: string,
  dayNum: number,
  isVeg: boolean,
  isGermany: boolean,
  isSwiss: boolean,
  isDubai: boolean,
): DayPlan {
  if (isGermany) {
    if (dayNum === 1) {
      return {
        day: 1,
        title: "Munich Altstadt Heritage, Marienplatz & Residenz Palace",
        stops: [
          {
            time: "10:00 AM",
            place: "Marienplatz & Glockenspiel Chime",
            type: "Historic City Square",
            what_to_do: "Watch the famous 1908 mechanical Glockenspiel reenacting the royal Bavarian wedding at 11:00 AM.",
            duration: "1.5 hours",
            cost_inr: "Free viewing",
            tip: "Climb St. Peter's Church tower (Alter Peter) for the quintessential postcard view over Marienplatz.",
          },
          {
            time: "02:30 PM",
            place: "Munich Residenz & Treasury",
            type: "Royal Palace",
            what_to_do: "Tour the lavish Renaissance corridors, Antiquarium hall, and Bavarian crown jewels.",
            duration: "2 hours",
            cost_inr: "₹1,200 (€13)",
            tip: "Audio guides in English are included with the entry ticket.",
          },
        ],
        food: [
          {
            name: "Saravanaa Bhavan, Munich Hbf",
            cuisine: "Pure Vegetarian South Indian & Dosa",
            veg_friendly: true,
            cost_per_person_inr: "₹1,400 - ₹2,100 (€15 - €22)",
          },
          {
            name: "Augustiner Klosterwirt, Frauenplatz",
            cuisine: "Traditional Bavarian Pretzels, Knödel & Roast",
            veg_friendly: true,
            cost_per_person_inr: "₹1,800 - ₹2,800 (€20 - €30)",
          },
        ],
        transport: "MVV Day Ticket (Zone M) for S-Bahn, U-Bahn, and Trams",
      };
    }
    if (dayNum === 2) {
      return {
        day: 2,
        title: "Füssen Alpine Excursion & Neuschwanstein Castle",
        stops: [
          {
            time: "09:00 AM",
            place: "Neuschwanstein Fairy Tale Castle, Hohenschwangau",
            type: "Alpine Castle",
            what_to_do: "Explore King Ludwig II's 19th-century Romanesque Revival castle overlooking the Bavarian Alps and Alpsee.",
            duration: "3 hours",
            cost_inr: "₹1,900 (€20.50)",
            tip: "Walk out to Marienbrücke (Mary's Bridge) for the iconic viewpoint across Pöllat Gorge.",
          },
          {
            time: "03:00 PM",
            place: "Alpsee Lake & Füssen Old Town",
            type: "Lakes & Alpine Villages",
            what_to_do: "Stroll along the pristine turquoise waters of Alpsee and explore Füssen's pastel-painted medieval lanes.",
            duration: "2 hours",
            cost_inr: "Free",
            tip: "Paddle boats are available for rent during warmer months.",
          },
        ],
        food: [
          {
            name: "Madame Plüsch, Füssen",
            cuisine: "Bavarian Specialities & Veg Kässpätzle",
            veg_friendly: true,
            cost_per_person_inr: "₹1,600 - ₹2,400 (€18 - €26)",
          },
          {
            name: "Taj Mahal Indian Restaurant, Füssen",
            cuisine: "North Indian Curries, Naan & Dal",
            veg_friendly: true,
            cost_per_person_inr: "₹1,500 - ₹2,200 (€16 - €24)",
          },
        ],
        transport: "Regional Express train from Munich Hbf to Füssen (covered by Bayern Ticket, approx ₹2,700 for groups)",
      };
    }
  }

  if (isDubai) {
    if (dayNum === 1) {
      return {
        day: 1,
        title: "Modern Marvels: Burj Khalifa & Dubai Mall Fountains",
        stops: [
          {
            time: "11:00 AM",
            place: "At The Top, Burj Khalifa (Levels 124 & 125)",
            type: "Observation Deck",
            what_to_do: "Enjoy 360-degree views across Dubai skyline, Sheikh Zayed Road, and the Persian Gulf.",
            duration: "2 hours",
            cost_inr: "₹3,900 (AED 179)",
            tip: "Prebook sunset slots 2 weeks early to watch the transition from day to evening illuminations.",
          },
          {
            time: "06:30 PM",
            place: "The Dubai Fountain Show & Souk Al Bahar",
            type: "Light & Water Spectacle",
            what_to_do: "Watch the world's largest choreographed fountain system set to global melodies and Arabic rhythms.",
            duration: "1.5 hours",
            cost_inr: "Free viewing",
            tip: "Watch from the bridge connecting Dubai Mall to Souk Al Bahar for an elevated vantage point.",
          },
        ],
        food: [
          {
            name: "Gazebo Indian Restaurant, Dubai Mall",
            cuisine: "Dum Pukht Biryani & Mughlai",
            veg_friendly: true,
            cost_per_person_inr: "₹1,200 - ₹1,800 (AED 55 - 80)",
          },
          {
            name: "Al Hallab, Dubai Mall Waterfront",
            cuisine: "Lebanese & Mezze Platters",
            veg_friendly: true,
            cost_per_person_inr: "₹1,500 - ₹2,200 (AED 70 - 100)",
          },
        ],
        transport: "Dubai Metro Red Line to Burj Khalifa / Dubai Mall station via air-conditioned travellator link",
      };
    }
  }

  // Generic international day
  return {
    day: dayNum,
    title: `Discovering ${dest}: Iconic Sights & Cultural Landmarks (Day ${dayNum})`,
    stops: [
      {
        time: "10:00 AM",
        place: `${dest} Historic Old City & Grand Cathedral`,
        type: "Architecture & History",
        what_to_do: "Explore the historic center, grand boulevards, and signature monuments.",
        duration: "2.5 hours",
        cost_inr: "₹1,200 - ₹1,800",
        tip: "Download offline maps on Google Maps beforehand for smooth navigation without data roaming.",
      },
      {
        time: "03:00 PM",
        place: `${dest} Riverfront Promenade & Panorama Deck`,
        type: "Viewpoints",
        what_to_do: "Relax along the vibrant riverside esplanade and capture skyline sunset views.",
        duration: "2 hours",
        cost_inr: "Free - ₹800",
        tip: "Great spot for evening coffee and people watching.",
      },
    ],
    food: [
      {
        name: `Little India Kitchen, ${dest}`,
        cuisine: "Authentic Indian Curries, Biryani & Tandoor",
        veg_friendly: true,
        cost_per_person_inr: "₹1,500 - ₹2,400",
      },
      {
        name: `Bistro de ${dest}`,
        cuisine: "Local Continental & Vegetarian Pasta",
        veg_friendly: true,
        cost_per_person_inr: "₹1,800 - ₹2,800",
      },
    ],
    transport: "City metro or day transit pass",
  };
}
