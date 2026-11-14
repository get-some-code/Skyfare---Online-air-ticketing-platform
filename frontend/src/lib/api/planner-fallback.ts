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

/* =========================================================================
   MANALI 14 DISTINCT DAYS CATALOG
   ========================================================================= */
const MANALI_DAYS: Array<{ title: string; stops: DayPlan["stops"]; food: DayPlan["food"]; transport: string }> = [
  {
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
      { name: "The Lazy Dog Lounge, Old Manali", cuisine: "Continental, Himachali & Trout", veg_friendly: true, cost_per_person_inr: "₹600 - ₹900" },
      { name: "Drifters' Cafe, Manu Temple Road", cuisine: "Cafe, Mediterranean & Comfort Food", veg_friendly: true, cost_per_person_inr: "₹450 - ₹700" },
    ],
    transport: "Private auto-rickshaw or local taxi for local transfers",
  },
  {
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
      { name: "Palhamo Dhaba, Sissu", cuisine: "Tibetan Momos, Thukpa & Masala Chai", veg_friendly: true, cost_per_person_inr: "₹200 - ₹350" },
      { name: "Johnson's Cafe, Circuit House Road", cuisine: "Woodfired Pizza & Fresh Bakes", veg_friendly: true, cost_per_person_inr: "₹700 - ₹1,100" },
    ],
    transport: "Book an all-wheel-drive local commercial taxi (approx ₹3,500 - ₹4,500 for the day)",
  },
  {
    title: "Solang Valley Alpine Gondola & Anjani Mahadev Sacred Stream",
    stops: [
      {
        time: "09:00 AM",
        place: "Solang Valley Alpine Meadow",
        type: "Adventure & Panorama",
        what_to_do: "Take the cable car ropeway to Mt. Phatru ridge (10,500 ft) for panoramic views of Friendship Peak and paragliding takeoffs.",
        duration: "3 hours",
        cost_inr: "₹750 for ropeway gondola",
        tip: "Negotiate paragliding directly at the government-authorized counter to avoid unauthorized touts.",
      },
      {
        time: "02:30 PM",
        place: "Anjani Mahadev Stream & Shivalinga",
        type: "Sacred Stream & Nature Hike",
        what_to_do: "Take a scenic 2 km forest trail or pony ride up to the natural cliffside waterfall where water drops over an open-air Shivalinga.",
        duration: "2 hours",
        cost_inr: "Free hike / ₹500 pony",
        tip: "Wear waterproof boots as the rocky approach can get slippery with glacier meltwater.",
      },
    ],
    food: [
      { name: "Cafe 1947, Near Nehru Kund", cuisine: "Riverside Italian, Pasta & Risotto", veg_friendly: true, cost_per_person_inr: "₹650 - ₹950" },
      { name: "Mayur Restaurant, Mall Road", cuisine: "North Indian Pure Veg Thali & Paneer", veg_friendly: true, cost_per_person_inr: "₹350 - ₹550" },
    ],
    transport: "Prepaid taxi union cab (approx ₹2,200 roundtrip)",
  },
  {
    title: "Rohtang Pass (13,058 FT) Snowfields & Marhi Alpine Vista",
    stops: [
      {
        time: "07:30 AM",
        place: "Rohtang Pass High Mountain Highway (13,058 FT)",
        type: "High-Altitude Pass",
        what_to_do: "Ascend the iconic Pir Panjal pass offering 360-degree views of snow-capped peaks, glaciers, and Chandra River source.",
        duration: "3.5 hours",
        cost_inr: "Green permit fee ₹550 per vehicle",
        tip: "Apply for the Rohtang Pass permit online at least 3 days in advance; morning entries close early.",
      },
      {
        time: "01:30 PM",
        place: "Marhi Meadow & Beas Kund Lookout",
        type: "Alpine Ridge & Viewpoint",
        what_to_do: "Pause at the scenic plateau overlooking deep alpine valleys and enjoy steaming Maggi and ginger tea amidst mountain clouds.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Rent warm snowsuits and gumboots from verified government-registered shops in Kothi.",
      },
    ],
    food: [
      { name: "Chopsticks Restaurant, Mall Road", cuisine: "Tibetan Thukpa, Momos & Asian", veg_friendly: true, cost_per_person_inr: "₹450 - ₹700" },
      { name: "Il Forno, Hadimba Road", cuisine: "Rustic Woodfired Pizza in Apple Orchard", veg_friendly: true, cost_per_person_inr: "₹750 - ₹1,200" },
    ],
    transport: "Dedicated Rohtang Pass Permit Taxi (approx ₹4,500 - ₹5,500)",
  },
  {
    title: "Naggar Castle Heritage, Roerich Art Gallery & Jana Waterfall",
    stops: [
      {
        time: "10:00 AM",
        place: "Naggar Castle (1460 AD Himalayan Citadel)",
        type: "Historic Fort & Art",
        what_to_do: "Tour the medieval wood and carved stone fortress overlooking the Beas valley and admire traditional Kath-Kuni earthquake-resistant architecture.",
        duration: "2 hours",
        cost_inr: "₹30 entry fee",
        tip: "Have a cup of spiced tea at the open-air castle courtyard overlooking the river gorge.",
      },
      {
        time: "02:00 PM",
        place: "Nicholas Roerich Art Gallery & Jana Waterfalls",
        type: "Art Estate & Pine Waterfall",
        what_to_do: "Visit the serene Russian painter's estate, followed by a scenic detour to the rustic wooden bridges of Jana Waterfall.",
        duration: "2.5 hours",
        cost_inr: "₹50 entry",
        tip: "Try freshly steamed Himachali Siddu dipped in hot ghee at the local village dhaba beside the falls.",
      },
    ],
    food: [
      { name: "Jana Waterfall Traditional Dhaba", cuisine: "Himachali Siddu, Makki Roti & Chana Madra", veg_friendly: true, cost_per_person_inr: "₹250 - ₹400" },
      { name: "Nightingale Italian Restaurant, Naggar", cuisine: "Woodfired Pizza & Fresh Apple Tart", veg_friendly: true, cost_per_person_inr: "₹600 - ₹950" },
    ],
    transport: "Full day private taxi to Naggar valley (approx ₹2,800)",
  },
  {
    title: "Jogini Waterfalls Pine Forest Hike & Vashisht Sulphur Springs",
    stops: [
      {
        time: "09:30 AM",
        place: "Jogini Waterfalls Forest Trail",
        type: "Nature Trek & Waterfalls",
        what_to_do: "Hike through whispering deodar groves and apple orchards to reach the twin cascades plunge pool with views of Manali valley.",
        duration: "2.5 hours",
        cost_inr: "Free",
        tip: "Carry your own water bottle and wear sneakers with good grip on dirt trails.",
      },
      {
        time: "02:30 PM",
        place: "Vashisht Village & Natural Sulphur Springs",
        type: "Ancient Temple & Healing Springs",
        what_to_do: "Visit the 4,000-year-old Vashisht sage temple and experience the rejuvenating natural mineral hot spring baths.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Separate private bathing cubicles are available for men and women.",
      },
    ],
    food: [
      { name: "Dylan's Toasted & Roasted Coffee House", cuisine: "Artisan Coffee, Warm Cinnamon Rolls & Cookies", veg_friendly: true, cost_per_person_inr: "₹250 - ₹450" },
      { name: "People Cafe, Old Manali", cuisine: "Organic Smoothies, Salads & Middle Eastern", veg_friendly: true, cost_per_person_inr: "₹400 - ₹650" },
    ],
    transport: "Walking from Vashisht bridge or local auto-rickshaw",
  },
  {
    title: "Parvati Valley Day Excursion: Kasol Cafes & Manikaran Sahib",
    stops: [
      {
        time: "09:00 AM",
        place: "Kasol Village & Parvati River Trail",
        type: "Bohemian Cafes & Pine Woods",
        what_to_do: "Walk along the roaring turquoise Parvati river across wooden suspension bridges and explore vibrant Bohemian artisan stalls.",
        duration: "2 hours",
        cost_inr: "Free",
        tip: "Explore the scenic riverbank path toward Chalal village for absolute tranquility.",
      },
      {
        time: "01:30 PM",
        place: "Gurudwara Shri Manikaran Sahib",
        type: "Spiritual Landmark & Hot Springs",
        what_to_do: "Visit the historic Sikh pilgrimage shrine where food in the community Langar is naturally cooked in boiling geothermal pools.",
        duration: "2 hours",
        cost_inr: "Free / voluntary donation",
        tip: "Head covering is mandatory inside the Gurudwara premises; handkerchiefs are available at the entrance.",
      },
    ],
    food: [
      { name: "Moon Dance Cafe, Kasol", cuisine: "Israeli Shakshuka, Hummus & Fresh Bakery", veg_friendly: true, cost_per_person_inr: "₹450 - ₹750" },
      { name: "Evergreen Restaurant, Kasol", cuisine: "Woodfired Lasagna, Falafel & Fresh Juices", veg_friendly: true, cost_per_person_inr: "₹500 - ₹850" },
    ],
    transport: "Private roundtrip taxi to Kasol & Manikaran (approx ₹3,800)",
  },
  {
    title: "Sethan Igloo Valley (Hampta Base) & Himalayan Buddhist Monasteries",
    stops: [
      {
        time: "10:00 AM",
        place: "Sethan Village (8,900 FT)",
        type: "High Mountain Village",
        what_to_do: "Drive up 35 hairpin bends to the tiny Buddhist hamlet overlooking Dhauladhar ranges, popular for igloo stays and Hampta Pass gateway.",
        duration: "2.5 hours",
        cost_inr: "Free / 4x4 cab fare",
        tip: "Check winter road conditions; during snowfall chains are needed on tyres.",
      },
      {
        time: "03:00 PM",
        place: "Himalayan Nyingmapa Buddhist Temple",
        type: "Monastery & Meditation",
        what_to_do: "Spin the massive golden prayer wheels and admire the serene two-storey golden statue of Lord Buddha amidst chanting monks.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Observe silence inside the main prayer hall.",
      },
    ],
    food: [
      { name: "Mount View Restaurant, Mall Road", cuisine: "Tibetan, Continental & Indian", veg_friendly: true, cost_per_person_inr: "₹400 - ₹650" },
      { name: "The Corner House Restaurant", cuisine: "Steaks, Pasta & Warm Apple Crumble", veg_friendly: true, cost_per_person_inr: "₹650 - ₹1,000" },
    ],
    transport: "4x4 Gypsy or SUV for Sethan uphill drive",
  },
  {
    title: "Beas River White Water Rafting & Kullu Handloom Weavers Trail",
    stops: [
      {
        time: "09:30 AM",
        place: "Beas River Rafting Point, Pirdi (Grade II & III Rapids)",
        type: "Water Adventure",
        what_to_do: "Experience a thrilling 7 km or 14 km white-water rafting expedition through tumbling river rapids guided by certified instructors.",
        duration: "2.5 hours",
        cost_inr: "₹1,200 - ₹1,800 per person",
        tip: "Wear quick-dry clothes and rent a waterproof GoPro to capture the rapids footage.",
      },
      {
        time: "02:30 PM",
        place: "Bhutti Weavers Handloom Cooperative, Kullu",
        type: "Artisan Heritage",
        what_to_do: "Watch master weavers create authentic GI-tagged Kullu shawls, tweed jackets, and pure wool caps on hand-operated wooden looms.",
        duration: "2 hours",
        cost_inr: "Free entry / Shopping",
        tip: "Government-approved genuine seal ensures 100% pure Himalayan Merino wool.",
      },
    ],
    food: [
      { name: "Maitre Bakery & Cafe, Kullu", cuisine: "Artisan Bread, Pastries & Espresso", veg_friendly: true, cost_per_person_inr: "₹300 - ₹500" },
      { name: "Apple Blossom Restaurant", cuisine: "Traditional Himachali & North Indian Curries", veg_friendly: true, cost_per_person_inr: "₹550 - ₹850" },
    ],
    transport: "Taxi transfer to Kullu river corridor",
  },
  {
    title: "Gulaba Alpine Snow Ridge & Kothi Village Gorge Photography",
    stops: [
      {
        time: "09:00 AM",
        place: "Kothi Picturesque Gorge & Deep Beas Chasm",
        type: "Scenic Gorge & Nature",
        what_to_do: "Photograph the dramatic canyon where the Beas river rushes through a narrow geological chasm flanked by towering granite walls.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Early morning sunlight illuminates the gorge cliffs brilliantly for photography.",
      },
      {
        time: "11:30 AM",
        place: "Gulaba Alpine Meadows & Snow Viewpoint",
        type: "Mountain Vista & Pine Treks",
        what_to_do: "Walk through untouched sub-alpine meadows offering bird's-eye views over Rohtang Pass foothills and distant glaciers.",
        duration: "2.5 hours",
        cost_inr: "Free",
        tip: "A peaceful, uncrowded alternative to Solang Valley with zero commercial hustle.",
      },
    ],
    food: [
      { name: "Southern Souls, Model Town", cuisine: "Pure Vegetarian South Indian Dosa & Filter Coffee", veg_friendly: true, cost_per_person_inr: "₹250 - ₹400" },
      { name: "Cafe Meraki, Old Manali", cuisine: "Burgers, Smoothies & Belgian Waffles", veg_friendly: true, cost_per_person_inr: "₹350 - ₹600" },
    ],
    transport: "Local private cab up the Manali-Leh highway",
  },
  {
    title: "Sainj Valley Shangarh Meadow Hidden Forest Excursion",
    stops: [
      {
        time: "09:00 AM",
        place: "Shangarh UNESCO Buffer Valley Meadow",
        type: "Pristine Alpine Plateau",
        what_to_do: "Explore the legendary 128-bigha green meadow believed in local mythology to have been cultivated by the Pandavas.",
        duration: "3 hours",
        cost_inr: "Free",
        tip: "Shoes are strictly prohibited on the sacred central temple meadow area.",
      },
      {
        time: "02:00 PM",
        place: "Sangchul Mahadev Ancient Wood Temple",
        type: "Intricate Wooden Shrine",
        what_to_do: "Admire multi-tiered pagoda architecture, handcrafted deity masks, and tranquil pine forest trails.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Respect local sacred boundaries marked around the sanctum.",
      },
    ],
    food: [
      { name: "The Pine Cottage Cafe, Shangarh", cuisine: "Homestyle Dal, Rice, Siddu & Chai", veg_friendly: true, cost_per_person_inr: "₹200 - ₹350" },
      { name: "Cafe Nirvana, Sainj", cuisine: "Pancakes, Hot Soups & Himalayan Herbal Teas", veg_friendly: true, cost_per_person_inr: "₹300 - ₹500" },
    ],
    transport: "Private day excursion cab to Sainj Valley (approx ₹4,200)",
  },
  {
    title: "Chalal Riverside Pine Trail & Parvati Musical Cafes",
    stops: [
      {
        time: "10:30 AM",
        place: "Chalal Village Riverside Trail",
        type: "Gentle Pine Forest Trek",
        what_to_do: "Hike along the gentle dirt trail shaded by tall pines to the quiet artist hamlet of Chalal across the Parvati footbridge.",
        duration: "2.5 hours",
        cost_inr: "Free",
        tip: "The soothing sound of rushing glacier water accompanies the entire walk.",
      },
      {
        time: "03:30 PM",
        place: "Kasol Artisan Flea Alley & Dreamcatcher Stalls",
        type: "Bohemian Craft Market",
        what_to_do: "Browse handcrafted dreamcatchers, hand-knitted woolen socks, organic incense, and Tibetan copper singing bowls.",
        duration: "2 hours",
        cost_inr: "Free",
        tip: "Support independent local artisans who handcraft items on-site.",
      },
    ],
    food: [
      { name: "Jim Morrison Cafe, Manikaran Road", cuisine: "Pure Veg Sandwiches, Pizza & Fresh Juices", veg_friendly: true, cost_per_person_inr: "₹350 - ₹600" },
      { name: "Shiva Shanti Cafe, Chalal", cuisine: "Warm Apple Crumble & Masala Chai", veg_friendly: true, cost_per_person_inr: "₹250 - ₹450" },
    ],
    transport: "Walking foot trail and local taxi transfer",
  },
  {
    title: "Tirthan Valley River Corridor & Chhoie Waterfall Trek",
    stops: [
      {
        time: "09:30 AM",
        place: "Tirthan River Conservation Sanctuary, Gushaini",
        type: "Crystal River Basin",
        what_to_do: "Relax by the pristine pebble banks of the unpolluted Tirthan river in the buffer zone of Great Himalayan National Park.",
        duration: "2.5 hours",
        cost_inr: "Free",
        tip: "Angling permits for trout fishing are available at the local fisheries department.",
      },
      {
        time: "02:30 PM",
        place: "Chhoie Waterfall Secret Cascade",
        type: "Hidden Forest Waterfall",
        what_to_do: "Short 45-minute uphill trek through deodar woodlands to a hidden natural cascade tumbling into an emerald plunge pool.",
        duration: "2 hours",
        cost_inr: "Free",
        tip: "Pack light as the stepped stone trail climbs gently.",
      },
    ],
    food: [
      { name: "Trout House Grill & Cafe, Gushaini", cuisine: "Tirthan Trout & Himachali Thali", veg_friendly: true, cost_per_person_inr: "₹550 - ₹900" },
      { name: "Himalayan Wild Cafe", cuisine: "Fresh Bakes, Woodfired Pizza & Organic Teas", veg_friendly: true, cost_per_person_inr: "₹400 - ₹650" },
    ],
    transport: "Private day cab to Tirthan Valley (approx ₹4,000)",
  },
  {
    title: "Mall Road Souvenirs, Tibetan Craft Emporium & Departure Corridor",
    stops: [
      {
        time: "10:00 AM",
        place: "Tibetan Market & Himachali State Handicrafts Emporium",
        type: "Souvenir Shopping & Antiques",
        what_to_do: "Pick up authentic apple cider vinegar, wildflower mountain honey, carved cedar wooden artifacts, and warm hand-woven blankets.",
        duration: "2.5 hours",
        cost_inr: "Free entry / Shopping",
        tip: "Visit the government emporium for fixed-price, certified authentic items.",
      },
      {
        time: "02:30 PM",
        place: "Van Vihar Pine Forest & Nature Promenade",
        type: "Riverside Park & Boating",
        what_to_do: "Enjoy a final peaceful stroll under towering 150-year-old pine canopies and paddle on the small mountain lake.",
        duration: "1.5 hours",
        cost_inr: "₹30 park entry",
        tip: "Direct access to the pebble banks of Beas river for peaceful farewell photographs.",
      },
    ],
    food: [
      { name: "Cafe Amigos, Mall Road", cuisine: "Specialty Espresso, Chocolate Walnut Pie & Bagels", veg_friendly: true, cost_per_person_inr: "₹300 - ₹500" },
      { name: "Sher-e-Punjab, Mall Road", cuisine: "Classic North Indian Dal Makhani & Butter Naan", veg_friendly: true, cost_per_person_inr: "₹450 - ₹700" },
    ],
    transport: "Prepaid taxi or Volvo coach pickup from Private Bus Stand",
  },
];

/* =========================================================================
   GOA 14 DISTINCT DAYS CATALOG
   ========================================================================= */
const GOA_DAYS: Array<{ title: string; stops: DayPlan["stops"]; food: DayPlan["food"]; transport: string }> = [
  {
    title: "North Goa Coastal Heritage, Fort Aguada & Sinquerim Lighthouse",
    stops: [
      { time: "10:00 AM", place: "Fort Aguada & 17th-Century Portuguese Lighthouse", type: "Coastal Fort", what_to_do: "Explore the massive sea bastion built in 1612 with panoramic Arabian Sea views.", duration: "2 hours", cost_inr: "₹50 entry", tip: "Visit early to avoid midday sun." },
      { time: "04:30 PM", place: "Sinquerim Beach & Water Promenade", type: "Sandy Beach", what_to_do: "Watch the golden sunset over the ancient fortification walls.", duration: "2 hours", cost_inr: "Free", tip: "Great spot for relaxed evening walks." },
    ],
    food: [
      { name: "Gunpowder, Assagao", cuisine: "Coastal South Indian & Veg Delicacies", veg_friendly: true, cost_per_person_inr: "₹700 - ₹1,100" },
      { name: "Fisherman's Wharf, Calangute", cuisine: "Goan Curry & Multi-Cuisine", veg_friendly: true, cost_per_person_inr: "₹800 - ₹1,300" },
    ],
    transport: "Self-drive car or scooter rental",
  },
  {
    title: "Old Goa UNESCO Basilica & Fontainhas Latin Quarter Heritage Walk",
    stops: [
      { time: "09:30 AM", place: "Basilica of Bom Jesus & Se Cathedral", type: "UNESCO Heritage", what_to_do: "Admire exquisite Baroque architecture and sacred relics of St. Francis Xavier.", duration: "2.5 hours", cost_inr: "Free", tip: "Modest attire covering shoulders and knees is required." },
      { time: "02:30 PM", place: "Fontainhas Latin Quarter, Panaji", type: "Colonial Architecture", what_to_do: "Stroll along pastel yellow, blue, and terracotta Portuguese mansions and art galleries.", duration: "2 hours", cost_inr: "Free", tip: "Drop into a traditional bakery for warm Bebinca." },
    ],
    food: [
      { name: "Viva Panjim, Fontainhas", cuisine: "Traditional Goan & Veg Vindaloo", veg_friendly: true, cost_per_person_inr: "₹450 - ₹750" },
      { name: "Confeitaria 31 De Janeiro", cuisine: "Heritage Goan Bakery & Pastel de Nata", veg_friendly: true, cost_per_person_inr: "₹200 - ₹350" },
    ],
    transport: "Cab or scooter to Panaji",
  },
  {
    title: "Anjuna Flea Market, Chapora Fort & Vagator Cliff Sunset",
    stops: [
      { time: "10:30 AM", place: "Anjuna Beachside Artisan Market", type: "Cultural Flea Market", what_to_do: "Browse handcrafted silver jewelry, organic spices, and beachwear.", duration: "2 hours", cost_inr: "Free entry", tip: "Friendly bargaining is customary." },
      { time: "04:30 PM", place: "Chapora Fort (Dil Chahta Hai Fort)", type: "Hilltop Bastion", what_to_do: "Climb red laterite ramparts overlooking Ozran beach and Vagator bay.", duration: "2 hours", cost_inr: "Free", tip: "Carry drinking water for the stepped climb." },
    ],
    food: [
      { name: "Antares Restaurant, Vagator", cuisine: "Modern Australian & Coastal Grills", veg_friendly: true, cost_per_person_inr: "₹900 - ₹1,500" },
      { name: "Burger Factory, Anjuna", cuisine: "Gourmet Burgers & Fresh Shakes", veg_friendly: true, cost_per_person_inr: "₹450 - ₹700" },
    ],
    transport: "Scooter or taxi",
  },
  {
    title: "South Goa Serene Palolem Crescent Beach & Butterfly Island",
    stops: [
      { time: "10:00 AM", place: "Palolem Beach Protected Bay", type: "Crescent Beach", what_to_do: "Swim in calm, shallow waters shaded by coconut palms.", duration: "3 hours", cost_inr: "Free", tip: "Rent a kayak to explore nearby monkey island." },
      { time: "03:30 PM", place: "Butterfly Island Scenic Boat Cruise", type: "Hidden Lagoon", what_to_do: "Take a traditional motorized boat into the secluded cove for dolphin spotting.", duration: "2 hours", cost_inr: "₹1,000 per boat", tip: "Keep your camera ready for playful bottlenose dolphins." },
    ],
    food: [
      { name: "Dropadi Restaurant, Palolem", cuisine: "Fresh Catch, Butter Garlic & Veg Curries", veg_friendly: true, cost_per_person_inr: "₹650 - ₹1,000" },
      { name: "Magic Italy Pizzeria, Palolem", cuisine: "Authentic Italian Thin Crust Pizza", veg_friendly: true, cost_per_person_inr: "₹500 - ₹850" },
    ],
    transport: "Private car transfer to South Goa",
  },
  {
    title: "Dudhsagar Four-Tier Waterfalls & Sahakari Spice Plantation",
    stops: [
      { time: "08:30 AM", place: "Dudhsagar Waterfalls Jungle Jeep Safari", type: "Majestic Waterfall", what_to_do: "Drive a 4x4 open jeep through Bhagwan Mahavir Wildlife Sanctuary to the roaring 310m white cascade.", duration: "3.5 hours", cost_inr: "₹600 jeep seat + lifejacket", tip: "Life jackets are mandatory for swimming in the natural pool." },
      { time: "01:30 PM", place: "Sahakari Organic Spice Farm, Ponda", type: "Botanical Agro-Tourism", what_to_do: "Guided walking tour through cardamom, vanilla, and cinnamon groves followed by an authentic buffet lunch on banana leaves.", duration: "2 hours", cost_inr: "₹500 buffet inclusive", tip: "Enjoy the refreshing welcome drink of lemongrass and herbal ginger tea." },
    ],
    food: [
      { name: "Sahakari Traditional Buffet", cuisine: "Homestyle Goan Veg & Fish Thali", veg_friendly: true, cost_per_person_inr: "Included in entry" },
      { name: "Spice Goa, Karaswada", cuisine: "Traditional Fish Thali & Sol Kadhi", veg_friendly: true, cost_per_person_inr: "₹400 - ₹650" },
    ],
    transport: "Full day taxi hire to Mollem forest",
  },
  {
    title: "Divar Island Countryside Cycling & Mandovi River Cruise",
    stops: [
      { time: "09:30 AM", place: "Divar Island Ferry Crossing & Cycling Path", type: "Idyllic Island", what_to_do: "Take the complimentary government vehicle ferry and cycle past sleepy village paddy fields and Portuguese chapels.", duration: "3 hours", cost_inr: "Free ferry", tip: "Rent e-bikes from Panaji for an effortless scenic loop." },
      { time: "05:00 PM", place: "Mandovi River Sunset Catamaran", type: "River Cruise", what_to_do: "Cruise along the river mouth with live Goan folk dance and music performances.", duration: "1.5 hours", cost_inr: "₹500 per person", tip: "Board 20 minutes before departure for upper deck seats." },
    ],
    food: [
      { name: "Kokum Kitchen, Panaji", cuisine: "Authentic Goan Saraswat Brahmin Pure Veg", veg_friendly: true, cost_per_person_inr: "₹450 - ₹750" },
      { name: "The Black Sheep Bistro", cuisine: "Contemporary Farm-to-Table & Tapas", veg_friendly: true, cost_per_person_inr: "₹900 - ₹1,400" },
    ],
    transport: "Ferry and rental bicycle or taxi",
  },
  {
    title: "Morjim Turtle Conservation Beach & Ashvem Coastal Relaxation",
    stops: [
      { time: "10:00 AM", place: "Morjim Beach Turtle Nesting Sanctuary", type: "Protected Sandy Beach", what_to_do: "Relax on wide, uncrowded white sand dunes designated as a protected breeding ground for Olive Ridley sea turtles.", duration: "3 hours", cost_inr: "Free", tip: "Motorised water sports and loud music are strictly prohibited here to protect marine life." },
      { time: "04:30 PM", place: "Ashvem Beach Coconut Grove Promenade", type: "Quiet Coastal Shore", what_to_do: "Indulge in an oceanfront massage or sunset yoga on the clean sands.", duration: "2 hours", cost_inr: "Free", tip: "One of the best beaches for a tranquil evening without crowds." },
    ],
    food: [
      { name: "La Plage, Ashvem", cuisine: "French Coastal Bistro & Seafood", veg_friendly: true, cost_per_person_inr: "₹1,000 - ₹1,600" },
      { name: "Sublime, Morjim", cuisine: "Fusion European, Salads & Vegan Platters", veg_friendly: true, cost_per_person_inr: "₹750 - ₹1,200" },
    ],
    transport: "Rental car or taxi",
  },
];

/* =========================================================================
   LADAKH 7 DISTINCT DAYS CATALOG
   ========================================================================= */
const LADAKH_DAYS: Array<{ title: string; stops: DayPlan["stops"]; food: DayPlan["food"]; transport: string }> = [
  {
    title: "Leh Acclimatisation, Shanti Stupa & Historic Leh Palace",
    stops: [
      {
        time: "11:00 AM",
        place: "Shanti Stupa, Changspa",
        type: "Viewpoints & Peace Memorial",
        what_to_do: "Walk around the white-domed Buddhist stupa offering 360-degree views of Leh town, Namgyal Tsemo, and the Stok range.",
        duration: "1.5 hours",
        cost_inr: "Free entry",
        tip: "Climb slowly; allow your body to acclimatise to Leh's 11,500 ft elevation.",
      },
      {
        time: "03:30 PM",
        place: "Leh Royal Palace & Central Asian Museum",
        type: "Heritage & Architecture",
        what_to_do: "Explore the 17th-century nine-storey fortress palace modelled after Tibet's Potala Palace.",
        duration: "2 hours",
        cost_inr: "₹25 entry fee",
        tip: "Wear comfortable shoes for the rustic wooden stairways.",
      },
    ],
    food: [
      { name: "The Tibetan Kitchen, Fort Road", cuisine: "Authentic Ladakhi, Tingmo & Thukpa", veg_friendly: true, cost_per_person_inr: "₹450 - ₹750" },
      { name: "Bon Appetit, Changspa Lane", cuisine: "Woodfired Pizza & Local Apricot Bakes", veg_friendly: true, cost_per_person_inr: "₹600 - ₹900" },
    ],
    transport: "Local Leh registered commercial taxi or gentle walking in town",
  },
  {
    title: "Hall of Fame, Magnetic Hill & Indus-Zanskar Sangam",
    stops: [
      {
        time: "09:30 AM",
        place: "Hall of Fame War Museum",
        type: "National Heritage & Military Museum",
        what_to_do: "Pay homage to Indian Army soldiers and learn about Siachen Glacier logistics.",
        duration: "1.5 hours",
        cost_inr: "₹100 entry fee",
        tip: "Check out the high-altitude clothing and gear exhibit.",
      },
      {
        time: "12:00 PM",
        place: "Sangam (Confluence of Indus and Zanskar Rivers)",
        type: "Natural Marvel & River View",
        what_to_do: "Witness the distinct color contrast between emerald Indus and muddy Zanskar waters.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Optional grade 3 white-water rafting available in summer months.",
      },
    ],
    food: [
      { name: "Alchi Kitchen, Alchi Road", cuisine: "Traditional Ladakhi Khambir & Chhutagi", veg_friendly: true, cost_per_person_inr: "₹400 - ₹650" },
      { name: "Gesmo Restaurant, Fort Road", cuisine: "Yak Cheese Pizza & Fresh Pastries", veg_friendly: true, cost_per_person_inr: "₹350 - ₹550" },
    ],
    transport: "Leh Taxi Union 4x4 SUV (approx ₹3,200 for the sector)",
  },
  {
    title: "Shey Palace, Thiksey Monastery & Hemis Gompa",
    stops: [
      {
        time: "08:30 AM",
        place: "Thiksey Monastery (Mini Potala)",
        type: "Buddhist Heritage & Chanting",
        what_to_do: "Attend morning prayer assembly and gaze at the majestic 49-foot Maitreya Buddha statue.",
        duration: "2.5 hours",
        cost_inr: "₹50 entry fee",
        tip: "Arrive before 9 AM to hear the monks blowing ceremonial conch shells.",
      },
      {
        time: "01:30 PM",
        place: "Hemis Monastery & Sacred Museum",
        type: "Ancient Monastery & Museum",
        what_to_do: "Visit Ladakh's wealthiest Drukpa lineage monastery tucked in a secluded gorge.",
        duration: "2 hours",
        cost_inr: "₹100 entry fee",
        tip: "Visit the underground museum containing 1,000-year-old Buddhist scriptures.",
      },
    ],
    food: [
      { name: "Chamba Restaurant, Thiksey", cuisine: "Vegetarian Buffets & Ladakhi Butter Tea", veg_friendly: true, cost_per_person_inr: "₹400 - ₹600" },
      { name: "Lala's Cafe, Old Town Leh", cuisine: "Herbal Teas & Saffron Kahwa", veg_friendly: true, cost_per_person_inr: "₹250 - ₹400" },
    ],
    transport: "Private Innova / Scorpio hire (approx ₹3,800)",
  },
  {
    title: "Khardung La Pass (17,982 ft) & Hunder Sand Dunes",
    stops: [
      {
        time: "08:00 AM",
        place: "Khardung La Summit (World Famous Mountain Pass)",
        type: "High Altitude Pass",
        what_to_do: "Cross the legendary 17,982 ft gateway pass linking Leh valley to the remote Nubra Valley.",
        duration: "30 minutes",
        cost_inr: "ILP check included",
        tip: "Limit summit halt to under 20 minutes to prevent high-altitude sickness.",
      },
      {
        time: "03:30 PM",
        place: "Hunder White Sand Dunes & Double-Humped Camels",
        type: "Cold Desert Sand Dunes",
        what_to_do: "Experience the unique cold desert dunes surrounded by snowcapped Karakoram peaks.",
        duration: "2 hours",
        cost_inr: "₹350 camel ride",
        tip: "Carry sunglasses; wind gusts frequently whip up fine silica sand.",
      },
    ],
    food: [
      { name: "Nubra Organic Retreat Cafe, Hunder", cuisine: "Farm-to-Table Organic Vegetarian", veg_friendly: true, cost_per_person_inr: "₹500 - ₹750" },
      { name: "Rangyul Guest House Dining, Diskit", cuisine: "Homecooked North Indian Dal & Roti", veg_friendly: true, cost_per_person_inr: "₹300 - ₹500" },
    ],
    transport: "Commercial high-clearance SUV with tourist permit",
  },
  {
    title: "Diskit Giant Buddha & Scenic Shyok River Trail",
    stops: [
      {
        time: "09:00 AM",
        place: "Diskit Monastery & 106-ft Maitreya Statue",
        type: "Iconic Monument",
        what_to_do: "Admire the towering open-air Maitreya Buddha statue facing down the Shyok river towards Pakistan.",
        duration: "2 hours",
        cost_inr: "₹30 entry fee",
        tip: "Great early morning light for landscape photography.",
      },
      {
        time: "02:00 PM",
        place: "Turtuk Border Village Excursion",
        type: "Balti Culture & Apricot Orchards",
        what_to_do: "Explore one of India's northernmost villages, famed for stone houses and Balti heritage.",
        duration: "3 hours",
        cost_inr: "Free village entry",
        tip: "Try freshly plucked dried apricots and walnuts from local farmers.",
      },
    ],
    food: [
      { name: "Balti Kitchen, Turtuk", cuisine: "Balti Herbal Soups & Buckwheat Pancakes", veg_friendly: true, cost_per_person_inr: "₹350 - ₹600" },
      { name: "Cafe Diskit Terrace", cuisine: "Momos, Chowmein & Cardamom Tea", veg_friendly: true, cost_per_person_inr: "₹300 - ₹450" },
    ],
    transport: "Private tourist SUV for Nubra-Turtuk valley circuit",
  },
  {
    title: "Pangong Tso Alpine Lake & 3 Idiots Point",
    stops: [
      {
        time: "11:00 AM",
        place: "Pangong Tso Lake (Spangmik Viewpoint at 14,270 ft)",
        type: "Endorheic High-Altitude Salt Lake",
        what_to_do: "Watch the water change hues from turquoise to deep navy across the 134 km long trans-Himalayan lake.",
        duration: "3 hours",
        cost_inr: "Free viewing",
        tip: "Carry multiple thermal layers; lake winds can drop temperatures to near freezing even in July.",
      },
      {
        time: "03:30 PM",
        place: "Maan & Merak Village Sunset Trail",
        type: "Pristine Lake Coastline",
        what_to_do: "Stroll along undisturbed pebble beaches away from day-tripper crowds.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Stargazing at night here is among the clearest in the entire subcontinent.",
      },
    ],
    food: [
      { name: "Pangong Wooden Hut Dining, Spangmik", cuisine: "Hot Rajma Chawal & Maggie", veg_friendly: true, cost_per_person_inr: "₹250 - ₹400" },
      { name: "Eco Cafe Merak", cuisine: "Steamed Vegetable Dumplings & Ginger Lemon Tea", veg_friendly: true, cost_per_person_inr: "₹300 - ₹500" },
    ],
    transport: "SUV route via Agham-Shyok all-weather road",
  },
  {
    title: "Chang La Pass (17,688 ft) & Karu Valley Return to Leh",
    stops: [
      {
        time: "09:00 AM",
        place: "Chang La Mountain Pass",
        type: "High Elevation Alpine Pass",
        what_to_do: "Cross the third highest motorable pass in the world defended by the Indian Army's Trishul Division.",
        duration: "30 minutes",
        cost_inr: "Free tea at army outpost",
        tip: "Sip complimentary hot herbal tea provided by the Indian Army post.",
      },
      {
        time: "03:00 PM",
        place: "Leh Main Bazaar Artisans & Pashmina Weavers",
        type: "Shopping & Souvenirs",
        what_to_do: "Pick up GI-tagged Ladakh Pashmina shawls, seabuckthorn juice, and Buddhist prayer flags.",
        duration: "2 hours",
        cost_inr: "Shopping as per choice",
        tip: "Look for government-certified craft emporiums for authentic Pashmina tests.",
      },
    ],
    food: [
      { name: "Lamayuru Restaurant, Main Bazaar Leh", cuisine: "Israeli, North Indian & Vegan Platters", veg_friendly: true, cost_per_person_inr: "₹400 - ₹700" },
      { name: "Summer Harvest, Fort Road", cuisine: "Tandoori Platters & Tibetan Tingmo", veg_friendly: true, cost_per_person_inr: "₹500 - ₹800" },
    ],
    transport: "Full day return transfer cab into Leh hotel",
  },
];

function createDomesticDay(
  dest: string,
  dayNum: number,
  isVeg: boolean,
  isManali: boolean,
  isGoa: boolean,
  isLadakh: boolean,
): DayPlan {
  if (isManali) {
    const dayData = MANALI_DAYS[(dayNum - 1) % MANALI_DAYS.length];
    return {
      day: dayNum,
      title: `${dayData.title} (Day ${dayNum})`,
      stops: dayData.stops,
      food: dayData.food,
      transport: dayData.transport,
    };
  }

  if (isGoa) {
    const dayData = GOA_DAYS[(dayNum - 1) % GOA_DAYS.length];
    return {
      day: dayNum,
      title: `${dayData.title} (Day ${dayNum})`,
      stops: dayData.stops,
      food: dayData.food,
      transport: dayData.transport,
    };
  }

  if (isLadakh) {
    const dayData = LADAKH_DAYS[(dayNum - 1) % LADAKH_DAYS.length];
    return {
      day: dayNum,
      title: `${dayData.title} (Day ${dayNum})`,
      stops: dayData.stops,
      food: dayData.food,
      transport: dayData.transport,
    };
  }

  // Dynamic distinct day generator for any domestic destination
  const genericThemes = [
    { title: "Arrival, Historic Old Quarter & Heritage Architecture Walk", morning: "Historic Old Town & Central Plaza", aft: "Sunset Panoramic Ridge & Artisan Lanes" },
    { title: "Grand Citadels, Royal Palaces & Museum Antiquities", morning: "Royal Fortress & Ancient Palace Chambers", aft: "Craft Bazaar & Local Textile Guilds" },
    { title: "Panoramic Mountain Heights, Forest Waterfalls & Nature Treks", morning: "Alpine Ridge / Scenic Viewpoint", aft: "Cascading Waterfalls & Pine Stream Trail" },
    { title: "Sacred Shrines, Serene Riverfronts & Cultural Performing Arts", morning: "Centuries-Old Architectural Temple Sanctuary", aft: "Riverbank Promenade & Evening Light Ceremony" },
    { title: "Countryside Excursion & Traditional Agricultural Hamlets", morning: "Organic Spice / Apple Orchards & Country Road", aft: "Village Artisan Workshops & Local Delicacy Tasting" },
    { title: "Scenic Lakes, Waterfront Gondolas & Golden Hour Photography", morning: "Tranquil Lake Basin & Boating Pier", aft: "Botanical Terraces & Sculpture Gardens" },
    { title: "Artisan Souvenirs, Handloom Emproriums & Farewell Dinner", morning: "Traditional Handicraft Guilds & Local Markets", aft: "City Observation Terrace & Gourmet Dining" },
  ];

  const theme = genericThemes[(dayNum - 1) % genericThemes.length];
  return {
    day: dayNum,
    title: `${theme.title} (${dest} - Day ${dayNum})`,
    stops: [
      {
        time: "09:30 AM",
        place: `${dest} ${theme.morning}`,
        type: "Heritage Sightseeing",
        what_to_do: `Discover the signature architectural landmarks, historic corridors, and iconic monuments of ${dest}.`,
        duration: "2.5 hours",
        cost_inr: "₹100 - ₹350 entry fee",
        tip: "Hire a certified local ASI guide for authentic historical context.",
      },
      {
        time: "02:30 PM",
        place: `${dest} ${theme.aft}`,
        type: "Viewpoints & Nature",
        what_to_do: `Relax along scenic viewpoints, photography ridges, and bustling local markets of ${dest}.`,
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
        name: `The Royal Spice Haven, ${dest}`,
        cuisine: "North Indian & Local Delicacies",
        veg_friendly: true,
        cost_per_person_inr: "₹550 - ₹900",
      },
    ],
    transport: "Prepaid taxi or app-based cab",
  };
}

/* =========================================================================
   INTERNATIONAL CATALOG & DAYS
   ========================================================================= */
const GERMANY_DAYS: Array<{ title: string; stops: DayPlan["stops"]; food: DayPlan["food"]; transport: string }> = [
  {
    title: "Munich Altstadt Heritage, Marienplatz & Residenz Palace",
    stops: [
      { time: "10:00 AM", place: "Marienplatz & Glockenspiel Chime", type: "Historic City Square", what_to_do: "Watch the famous 1908 mechanical Glockenspiel reenacting royal wedding dances.", duration: "1.5 hours", cost_inr: "Free viewing", tip: "Climb St. Peter's Church tower for the postcard view." },
      { time: "02:30 PM", place: "Munich Residenz & Antiquarium Hall", type: "Royal Palace", what_to_do: "Tour lavish Renaissance corridors and Bavarian crown jewels.", duration: "2 hours", cost_inr: "₹1,200 (€13)", tip: "Audio guides in English are included." },
    ],
    food: [
      { name: "Saravanaa Bhavan, Munich Hbf", cuisine: "Pure Vegetarian South Indian & Dosa", veg_friendly: true, cost_per_person_inr: "₹1,400 - ₹2,100" },
      { name: "Augustiner Klosterwirt", cuisine: "Bavarian Pretzels, Knödel & Roast", veg_friendly: true, cost_per_person_inr: "₹1,800 - ₹2,800" },
    ],
    transport: "MVV Day Ticket (Zone M) for S-Bahn and Trams",
  },
  {
    title: "Füssen Alpine Excursion, Neuschwanstein Castle & Mary's Bridge",
    stops: [
      { time: "09:00 AM", place: "Neuschwanstein Fairy Tale Castle", type: "Alpine Castle", what_to_do: "Explore King Ludwig II's 19th-century Romanesque castle overlooking Bavarian Alps.", duration: "3 hours", cost_inr: "₹1,900 (€20.50)", tip: "Walk out to Marienbrücke for the iconic viewpoint across Pöllat Gorge." },
      { time: "03:00 PM", place: "Alpsee Lake & Füssen Old Town", type: "Lakes & Alpine Villages", what_to_do: "Stroll along turquoise waters of Alpsee and explore pastel-painted medieval lanes.", duration: "2 hours", cost_inr: "Free", tip: "Paddle boats available for rent during warmer months." },
    ],
    food: [
      { name: "Madame Plüsch, Füssen", cuisine: "Bavarian Specialities & Veg Kässpätzle", veg_friendly: true, cost_per_person_inr: "₹1,600 - ₹2,400" },
      { name: "Taj Mahal Indian Restaurant, Füssen", cuisine: "North Indian Curries, Naan & Dal", veg_friendly: true, cost_per_person_inr: "₹1,500 - ₹2,200" },
    ],
    transport: "Regional Express train covered by Bayern Ticket",
  },
  {
    title: "Nuremberg Imperial Castle & Germanic Cultural National Museum",
    stops: [
      { time: "10:00 AM", place: "Nuremberg Imperial Castle (Kaiserburg)", type: "Medieval Fortress", what_to_do: "Walk the sandstone battlements and deep well dating to Holy Roman Empire.", duration: "2.5 hours", cost_inr: "₹950 (€10)", tip: "Panoramic city views from the Sinwell Tower." },
      { time: "02:30 PM", place: "Germanisches Nationalmuseum & Hauptmarkt", type: "Art & Culture", what_to_do: "Explore world's oldest surviving terrestrial globe and historic gothic fountains.", duration: "2 hours", cost_inr: "₹950 (€10)", tip: "Spin the golden brass ring at the Schöner Brunnen fountain for good luck." },
    ],
    food: [
      { name: "Sangam Indian Restaurant, Nuremberg", cuisine: "Authentic Indian Curries & Biryani", veg_friendly: true, cost_per_person_inr: "₹1,500 - ₹2,200" },
      { name: "Bratwursthäusle bei St. Sebald", cuisine: "Historic Franconian Specialties", veg_friendly: true, cost_per_person_inr: "₹1,600 - ₹2,500" },
    ],
    transport: "ICE High-Speed Rail connection",
  },
  {
    title: "Black Forest Scenic Route B500, Lake Titisee & Triberg Waterfalls",
    stops: [
      { time: "09:30 AM", place: "Triberg Highest Waterfalls & Cuckoo Clock Center", type: "Cascading Falls & Forest", what_to_do: "Hike through dense pine forests to Germany's highest waterfall.", duration: "2.5 hours", cost_inr: "₹750 (€8)", tip: "Buy peanuts at the entrance to feed friendly red squirrels along the trail." },
      { time: "02:30 PM", place: "Lake Titisee Alpine Promenade", type: "Glacial Lake", what_to_do: "Enjoy an electric boat cruise across pristine glacial waters surrounded by dark pine ridges.", duration: "2 hours", cost_inr: "₹850 (€9)", tip: "Sample authentic Black Forest cherry cake at lakeside cafes." },
    ],
    food: [
      { name: "Café Schäfer, Triberg", cuisine: "Original Black Forest Gateau & Bakes", veg_friendly: true, cost_per_person_inr: "₹700 - ₹1,200" },
      { name: "Bergsee Restaurant, Titisee", cuisine: "Regional German & Vegetarian Spätzle", veg_friendly: true, cost_per_person_inr: "₹1,600 - ₹2,400" },
    ],
    transport: "Regional train or rental car via scenic B500",
  },
  {
    title: "Heidelberg Renaissance Castle & Philosopher's Walk",
    stops: [
      { time: "10:00 AM", place: "Heidelberg Castle & Great Vat", type: "Renaissance Ruins", what_to_do: "Take the funicular railway up to red sandstone castle ruins overlooking the Neckar river.", duration: "2.5 hours", cost_inr: "₹1,100 (€12)", tip: "Visit the German Pharmacy Museum housed inside the castle wing." },
      { time: "03:00 PM", place: "Philosophenweg (Philosopher's Walk) & Old Bridge", type: "Panoramic Vista", what_to_do: "Walk the sunny hillside trail frequented by university scholars with vistas of the old town.", duration: "2 hours", cost_inr: "Free", tip: "Cross the historic twin-towered Karl Theodor Bridge." },
    ],
    food: [
      { name: "Raja Rani Indian Fast Food, Heidelberg", cuisine: "Budget Indian Samosas, Chana & Naan", veg_friendly: true, cost_per_person_inr: "₹700 - ₹1,100" },
      { name: "Kulturbrauerei Heidelberg", cuisine: "Traditional Southern German & Veg Dishes", veg_friendly: true, cost_per_person_inr: "₹1,700 - ₹2,600" },
    ],
    transport: "Funicular and local tram",
  },
  {
    title: "Frankfurt Römerberg Historic Square & Main River Promenade",
    stops: [
      { time: "10:00 AM", place: "Römerberg Historic Square & St. Bartholomew Cathedral", type: "Historic Old Town", what_to_do: "Admire half-timbered merchant houses rebuilt after WWII and the imperial coronation cathedral.", duration: "2 hours", cost_inr: "Free", tip: "Ascend the 328-step cathedral tower for skyline vistas." },
      { time: "03:00 PM", place: "Museum Embankment (Museumsufer) & Iron Bridge (Eiserner Steg)", type: "Riverside Walk", what_to_do: "Walk across the pedestrian bridge adorned with love locks and relax along leafy river promenades.", duration: "2 hours", cost_inr: "Free", tip: "Great spot for sunset skyline photography over the financial skyscrapers." },
    ],
    food: [
      { name: "Saravanaa Bhavan, Kaiserstraße", cuisine: "South Indian Vegetarian Curries & Dosa", veg_friendly: true, cost_per_person_inr: "₹1,400 - ₹2,100" },
      { name: "Adolf Wagner, Sachsenhausen", cuisine: "Authentic Frankfurt Apfelwein & Local Dishes", veg_friendly: true, cost_per_person_inr: "₹1,800 - ₹2,800" },
    ],
    transport: "Frankfurt U-Bahn and S-Bahn network",
  },
  {
    title: "Berlin Brandenburg Gate, Reichstag Glass Dome & Museum Island",
    stops: [
      { time: "09:30 AM", place: "Brandenburg Gate & Reichstag Glass Dome", type: "National Monument", what_to_do: "Walk through the symbol of German reunification and ascend Sir Norman Foster's glass dome.", duration: "2.5 hours", cost_inr: "Free (advance registration required)", tip: "Book your free Reichstag dome entry online at least 3 weeks prior." },
      { time: "02:30 PM", place: "Museum Island (Museumsinsel) & Berlin Cathedral", type: "UNESCO Arts Complex", what_to_do: "Explore Pergamon Museum or Neues Museum housing the iconic bust of Nefertiti.", duration: "3 hours", cost_inr: "₹1,800 (€19)", tip: "Museum Island Day Pass grants admission to all 5 world-class museums." },
    ],
    food: [
      { name: "Amrit Indian Restaurant, Mitte", cuisine: "Tandoori, Paneer Tikka & Naan", veg_friendly: true, cost_per_person_inr: "₹1,500 - ₹2,300" },
      { name: "Monsieur Vuong, Alte Schönhauser Str", cuisine: "Fresh Vietnamese Pho & Spring Rolls", veg_friendly: true, cost_per_person_inr: "₹1,300 - ₹1,900" },
    ],
    transport: "Berlin BVG Day Ticket for U-Bahn and S-Bahn",
  },
];

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

/* =========================================================================
   SWITZERLAND 7 DISTINCT DAYS CATALOG
   ========================================================================= */
const SWISS_DAYS: Array<{ title: string; stops: DayPlan["stops"]; food: DayPlan["food"]; transport: string }> = [
  {
    title: "Zurich Old Town & Lake Promenade Vista",
    stops: [
      {
        time: "10:00 AM",
        place: "Grossmunster & Lindenhof Hill",
        type: "Historic Viewpoint",
        what_to_do: "Explore the Romanesque cathedral and look out over the Limmat River and old guild houses.",
        duration: "2 hours",
        cost_inr: "₹450 (CHF 5)",
        tip: "Climb the Karlsturm tower for panoramic alpine views.",
      },
      {
        time: "03:00 PM",
        place: "Lake Zurich Shore & Burkliplatz",
        type: "Lakeside Leisure",
        what_to_do: "Stroll along the lakeside gardens and take an electric passenger boat cruise.",
        duration: "2 hours",
        cost_inr: "₹800 (CHF 9)",
        tip: "Use Swiss Travel Pass for free unlimited ferry trips.",
      },
    ],
    food: [
      { name: "Hiltl, Sihlstrasse (World's Oldest Veg Restaurant)", cuisine: "Gourmet Vegetarian Buffet", veg_friendly: true, cost_per_person_inr: "₹2,400 - ₹3,600" },
      { name: "Zeughauskeller, Bahnhofstrasse", cuisine: "Swiss Sausages & Roesti", veg_friendly: true, cost_per_person_inr: "₹2,800 - ₹4,200" },
    ],
    transport: "Zurich ZVV Tram network with Swiss Travel Pass",
  },
  {
    title: "Lucerne Chapel Bridge & Mount Pilatus Golden Roundtrip",
    stops: [
      {
        time: "09:30 AM",
        place: "Kapellbrucke (Chapel Bridge) & Water Tower",
        type: "Medieval Landmark",
        what_to_do: "Walk the 14th-century covered wooden footbridge with historic interior paintings.",
        duration: "1.5 hours",
        cost_inr: "Free",
        tip: "Visit early morning before tourist coaches arrive.",
      },
      {
        time: "01:30 PM",
        place: "Mount Pilatus Dragon Ride Aerial Cableway",
        type: "High Alpine Summit",
        what_to_do: "Ride the world's steepest cogwheel railway up to 7,000 ft peaks.",
        duration: "3 hours",
        cost_inr: "₹6,500 (50% off with Swiss Pass)",
        tip: "Check live webcams at valley station for cloud cover.",
      },
    ],
    food: [
      { name: "Restaurant Fritschi, Lucerne", cuisine: "Swiss Cheese Fondue & Raclette", veg_friendly: true, cost_per_person_inr: "₹3,000 - ₹4,500" },
      { name: "Kanchi Indian Restaurant, Lucerne", cuisine: "North & South Indian Thali", veg_friendly: true, cost_per_person_inr: "₹2,200 - ₹3,400" },
    ],
    transport: "SBB Swiss Federal Railways intercity train",
  },
  {
    title: "Interlaken Lakes & Lauterbrunnen Valley of 72 Waterfalls",
    stops: [
      {
        time: "10:00 AM",
        place: "Staubbach Falls & Lauterbrunnen Valley",
        type: "Glacial Valley & Waterfalls",
        what_to_do: "Walk behind the 300-metre sheer waterfall plunging down vertical limestone cliffs.",
        duration: "2.5 hours",
        cost_inr: "Free",
        tip: "Wear a waterproof rain shell as spray is continuous.",
      },
      {
        time: "03:00 PM",
        place: "Trummelbach Glacial Chasm Falls",
        type: "Subterranean Glacier Falls",
        what_to_do: "Explore Europe's largest subterranean water caves carrying 20,000 litres of meltwater per second.",
        duration: "2 hours",
        cost_inr: "₹1,400 (CHF 15)",
        tip: "Temperature inside is cool; bring a light fleece.",
      },
    ],
    food: [
      { name: "Taj Palace Indian Restaurant, Interlaken", cuisine: "Indian Curry & Jain Specialities", veg_friendly: true, cost_per_person_inr: "₹2,000 - ₹3,200" },
      { name: "Bebbis Restaurant, Interlaken", cuisine: "Swiss Fondue & Roesti", veg_friendly: true, cost_per_person_inr: "₹2,500 - ₹3,800" },
    ],
    transport: "Berner Oberland Bahn scenic cogwheel train",
  },
  {
    title: "Jungfraujoch Top of Europe (11,333 ft) & Aletsch Glacier",
    stops: [
      {
        time: "09:00 AM",
        place: "Eiger Express 3S Gondola to Eigergletscher",
        type: "Panoramic Gondola",
        what_to_do: "Soar past the sheer north face of Mount Eiger on the ultra-modern tri-cable gondola.",
        duration: "1.5 hours",
        cost_inr: "Included in Jungfrau pass",
        tip: "Reserve seats in peak summer to skip boarding queues.",
      },
      {
        time: "11:30 AM",
        place: "Ice Palace & Sphinx Observatory",
        type: "High-Altitude Ice Tunnel",
        what_to_do: "Walk inside hand-carved ice caverns deep within the Great Aletsch Glacier.",
        duration: "2.5 hours",
        cost_inr: "Included in mountain pass",
        tip: "Walk slowly; air has significantly lower oxygen at 3,454m.",
      },
    ],
    food: [
      { name: "Restaurant Crystal, Jungfraujoch", cuisine: "Swiss & International Alpine Grill", veg_friendly: true, cost_per_person_inr: "₹3,500 - ₹5,000" },
      { name: "Restaurant Bollywood, Top of Europe", cuisine: "Authentic Indian Curries & Naan", veg_friendly: true, cost_per_person_inr: "₹2,600 - ₹3,800" },
    ],
    transport: "Jungfrau Railway high-alpine cogwheel train",
  },
  {
    title: "Grindelwald First Cliff Walk & Bachalpsee Alpine Lake",
    stops: [
      {
        time: "09:30 AM",
        place: "First Cliff Walk by Tissot",
        type: "Suspended Skywalk",
        what_to_do: "Step out onto a cantilevered walkway suspended over 1,000-ft mountain drops.",
        duration: "1.5 hours",
        cost_inr: "Free with First Gondola",
        tip: "Look down through the open metal grating at the alpine pastures.",
      },
      {
        time: "12:00 PM",
        place: "Bachalpsee Mountain Lake Hike",
        type: "Mirror Reflection Lake Hike",
        what_to_do: "Hike the 6 km scenic trail to see the Schreckhorn mirrored in pristine glacial waters.",
        duration: "3 hours",
        cost_inr: "Free trail",
        tip: "Carry drinking water and energy snacks.",
      },
    ],
    food: [
      { name: "Berggasthaus First Terrace", cuisine: "Apple Strudel & Swiss Roesti", veg_friendly: true, cost_per_person_inr: "₹1,800 - ₹2,800" },
      { name: "Barry's Lounge, Grindelwald", cuisine: "Swiss Mountain Gastronomy", veg_friendly: true, cost_per_person_inr: "₹2,600 - ₹4,000" },
    ],
    transport: "Grindelwald-First 6-seater aerial gondola",
  },
  {
    title: "Zermatt & Matterhorn Glacier Paradise Vista",
    stops: [
      {
        time: "10:00 AM",
        place: "Gornergrat Bahn Cogwheel Railway",
        type: "Historic Mountain Railway",
        what_to_do: "Ride Europe's oldest electrified rack railway to 10,134 ft viewing 29 four-thousand-metre peaks.",
        duration: "2.5 hours",
        cost_inr: "₹7,200 roundtrip",
        tip: "Sit on the right side of the train going up for iconic Matterhorn views.",
      },
      {
        time: "03:00 PM",
        place: "Riffelsee Lake Matterhorn Reflection",
        type: "Scenic Reflection Point",
        what_to_do: "Take the iconic postcard photograph of the pyramid-shaped Matterhorn mirrored in still water.",
        duration: "1.5 hours",
        cost_inr: "Free trail",
        tip: "Best photography occurs when afternoon wind dies down.",
      },
    ],
    food: [
      { name: "Golden India, Zermatt", cuisine: "Tandoori, Biryani & Jain Dal", veg_friendly: true, cost_per_person_inr: "₹2,400 - ₹3,600" },
      { name: "GramPi's, Zermatt", cuisine: "Italian Woodfired Pizza & Pasta", veg_friendly: true, cost_per_person_inr: "₹2,200 - ₹3,500" },
    ],
    transport: "Gornergrat rack railway and car-free electro-bus",
  },
  {
    title: "Bern UNESCO Old Town, Clock Tower & Aare River",
    stops: [
      {
        time: "10:00 AM",
        place: "Zytglogge (Medieval Astrological Clock Tower)",
        type: "UNESCO Heritage",
        what_to_do: "Watch the 4-minute animated puppet show before the clock strikes the hour.",
        duration: "1.5 hours",
        cost_inr: "Free exterior viewing",
        tip: "Stroll beneath Bern's famous 6 km of weather-protected sandstone arcades.",
      },
      {
        time: "02:30 PM",
        place: "Rosengarten (Rose Garden Panorama Terrace)",
        type: "City & Alpine Viewpoint",
        what_to_do: "Enjoy the best vantage point of the turquoise Aare River horseshoe loop enclosing the old town.",
        duration: "2 hours",
        cost_inr: "Free entry",
        tip: "Relax on the park benches and enjoy Swiss artisan ice cream.",
      },
    ],
    food: [
      { name: "Restaurant Rosengarten, Bern", cuisine: "Modern Swiss Bistro & Local Salads", veg_friendly: true, cost_per_person_inr: "₹2,500 - ₹3,800" },
      { name: "Tibits, Gurtengasse Bern", cuisine: "Pure Vegetarian & Vegan Gourmet Bar", veg_friendly: true, cost_per_person_inr: "₹1,800 - ₹2,900" },
    ],
    transport: "Bern Libero local tram and trolleybus network",
  },
];

/* =========================================================================
   DUBAI 7 DISTINCT DAYS CATALOG
   ========================================================================= */
const DUBAI_DAYS: Array<{ title: string; stops: DayPlan["stops"]; food: DayPlan["food"]; transport: string }> = [
  {
    title: "Burj Khalifa Observation & Dubai Mall Musical Fountains",
    stops: [
      {
        time: "10:30 AM",
        place: "At The Top, Burj Khalifa (Levels 124 & 125)",
        type: "Observation Deck",
        what_to_do: "Enjoy 360-degree vistas across Dubai skyline, Sheikh Zayed Road, and Arabian Gulf.",
        duration: "2 hours",
        cost_inr: "₹3,900 (AED 179)",
        tip: "Pre-book tickets online to skip ticket counter queues.",
      },
      {
        time: "06:30 PM",
        place: "The Dubai Fountain Show & Souk Al Bahar",
        type: "Light & Water Spectacle",
        what_to_do: "Watch the world's largest choreographed fountain system dancing to world music.",
        duration: "1.5 hours",
        cost_inr: "Free viewing",
        tip: "Watch from the bridge connecting Dubai Mall to Souk Al Bahar for an elevated vantage point.",
      },
    ],
    food: [
      { name: "Gazebo Indian Restaurant, Dubai Mall", cuisine: "Dum Pukht Biryani & Mughlai", veg_friendly: true, cost_per_person_inr: "₹1,200 - ₹1,800" },
      { name: "Al Hallab, Dubai Mall Waterfront", cuisine: "Lebanese & Mezze Platters", veg_friendly: true, cost_per_person_inr: "₹1,500 - ₹2,200" },
    ],
    transport: "Dubai Metro Red Line directly to Burj Khalifa / Dubai Mall station",
  },
  {
    title: "Old Dubai Heritage: Al Fahidi, Abra Boat & Gold Souk",
    stops: [
      {
        time: "09:30 AM",
        place: "Al Fahidi Historical Neighbourhood",
        type: "Heritage Architecture",
        what_to_do: "Wander through coral-stone wind-tower architecture and visit the Coffee Museum.",
        duration: "2 hours",
        cost_inr: "Free entry",
        tip: "Explore the art galleries and courtyards before midday heat.",
      },
      {
        time: "02:00 PM",
        place: "Dubai Creek Traditional Abra & Deira Gold Souk",
        type: "Water Taxi & Bazaar",
        what_to_do: "Cross the historic salt-water creek on an abra wooden boat and browse glittering jewellery.",
        duration: "2.5 hours",
        cost_inr: "₹25 (AED 1) for Abra ride",
        tip: "Bargain respectfully on craftsmanship charges at the Gold Souk.",
      },
    ],
    food: [
      { name: "Arabian Tea House, Al Bastakiya", cuisine: "Emirati Breakfast, Hummus & Fresh Juices", veg_friendly: true, cost_per_person_inr: "₹1,000 - ₹1,600" },
      { name: "Rangoli Vegetarian, Meena Bazaar", cuisine: "Pure Vegetarian Gujarati & Rajasthani Thali", veg_friendly: true, cost_per_person_inr: "₹500 - ₹850" },
    ],
    transport: "Dubai Metro Green Line & Traditional Wooden Abra boats",
  },
  {
    title: "Red Dune Desert Safari, Sandboarding & Bedouin Camp",
    stops: [
      {
        time: "02:30 PM",
        place: "Lahbab Red Dunes Safari",
        type: "Adventure 4x4 Dune Bashing",
        what_to_do: "Experience adrenaline-fueled 4x4 dune bashing across high crimson dunes.",
        duration: "2 hours",
        cost_inr: "₹2,800 - ₹4,200 package",
        tip: "Avoid heavy meals within 2 hours prior to dune bashing.",
      },
      {
        time: "06:00 PM",
        place: "Desert Bedouin Camp Under the Stars",
        type: "Culture & Live Shows",
        what_to_do: "Enjoy henna painting, Tanoura show, fire dancers, and a barbecue buffet.",
        duration: "3 hours",
        cost_inr: "Included in safari package",
        tip: "Wear sandals or slip-on shoes for easy sand removal.",
      },
    ],
    food: [
      { name: "Al Khayma Heritage Restaurant", cuisine: "Emirati Grilled Seafood & Falafel", veg_friendly: true, cost_per_person_inr: "₹1,400 - ₹2,200" },
      { name: "Camp Desert Buffet", cuisine: "Barbecue & Jain / Vegetarian Corner", veg_friendly: true, cost_per_person_inr: "Included in tour package" },
    ],
    transport: "Hotel pickup and drop in air-conditioned 4WD Land Cruiser",
  },
  {
    title: "Palm Jumeirah Monorail & Dubai Marina Luxury Yacht Cruise",
    stops: [
      {
        time: "10:30 AM",
        place: "The View at The Palm (Level 52, Palm Tower)",
        type: "Panoramic Island Deck",
        what_to_do: "Look out over the artificial archipelago of Palm Jumeirah and Atlantis The Royal.",
        duration: "1.5 hours",
        cost_inr: "₹2,200 (AED 100)",
        tip: "Take the scenic Palm Monorail from Gateway station.",
      },
      {
        time: "04:30 PM",
        place: "Dubai Marina Promenade & Sunset Yacht Cruise",
        type: "Waterfront & Yachting",
        what_to_do: "Cruise past towering illuminated skyscrapers, Ain Dubai wheel, and JBR beach.",
        duration: "2 hours",
        cost_inr: "₹2,600 (AED 120)",
        tip: "Sunset cruises from 5 PM to 7 PM provide the best skyline lighting.",
      },
    ],
    food: [
      { name: "Indego by Vineet, Grosvenor House", cuisine: "Michelin-starred Progressive Indian", veg_friendly: true, cost_per_person_inr: "₹3,500 - ₹5,500" },
      { name: "Pier 7 Marina Social", cuisine: "Mediterranean Waterfront Bistro", veg_friendly: true, cost_per_person_inr: "₹2,200 - ₹3,600" },
    ],
    transport: "Dubai Tram and Palm Jumeirah Monorail",
  },
  {
    title: "Museum of the Future & Dubai Frame Sunset Portal",
    stops: [
      {
        time: "10:00 AM",
        place: "Museum of the Future, Sheikh Zayed Road",
        type: "Architectural & Tech Marvel",
        what_to_do: "Explore innovative exhibits on space exploration, bioengineering, and ecosystems.",
        duration: "2.5 hours",
        cost_inr: "₹3,200 (AED 149)",
        tip: "Book tickets at least 3 to 4 weeks in advance as daily time slots sell out.",
      },
      {
        time: "04:30 PM",
        place: "The Dubai Frame, Zabeel Park",
        type: "Panoramic Glass Skybridge",
        what_to_do: "Walk the luminous glass bridge connecting views of historic Old Dubai with modern New Dubai.",
        duration: "1.5 hours",
        cost_inr: "₹1,150 (AED 52)",
        tip: "Step onto the central frosted glass panels that turn clear underneath your feet.",
      },
    ],
    food: [
      { name: "Tresind Dubai, voco Hotel", cuisine: "Modernist Indian Molecular Gastronomy", veg_friendly: true, cost_per_person_inr: "₹3,200 - ₹4,800" },
      { name: "Aroos Damascus, Deira", cuisine: "Authentic Syrian & Middle Eastern Grill", veg_friendly: true, cost_per_person_inr: "₹900 - ₹1,500" },
    ],
    transport: "Dubai Metro Red Line (Emirates Towers and Max stations)",
  },
  {
    title: "Abu Dhabi Day Trip: Sheikh Zayed Mosque & Louvre",
    stops: [
      {
        time: "09:30 AM",
        place: "Sheikh Zayed Grand Mosque, Abu Dhabi",
        type: "Architectural Wonder",
        what_to_do: "Marvel at 82 white marble domes, 24-carat gold chandeliers, and the world's largest hand-knotted carpet.",
        duration: "2.5 hours",
        cost_inr: "Free entry",
        tip: "Strict modest dress code: women must cover heads, arms, and ankles.",
      },
      {
        time: "02:30 PM",
        place: "Louvre Abu Dhabi, Saadiyat Island",
        type: "Universal Art Museum",
        what_to_do: "Experience the iconic 'Rain of Light' floating silver dome and priceless global art treasures.",
        duration: "2.5 hours",
        cost_inr: "₹1,450 (AED 65)",
        tip: "Pre-book online tickets to ensure guaranteed entry slot.",
      },
    ],
    food: [
      { name: "Punjab Grill, Venetian Village Abu Dhabi", cuisine: "Fine Dining North Indian & Tandoor", veg_friendly: true, cost_per_person_inr: "₹2,600 - ₹3,800" },
      { name: "Aptitude Cafe, Louvre Abu Dhabi", cuisine: "Artisan Coffee, Croissants & Paninis", veg_friendly: true, cost_per_person_inr: "₹900 - ₹1,400" },
    ],
    transport: "Private inter-emirate chauffeur or luxury coach (approx 1.5 hours each way)",
  },
  {
    title: "Miracle Garden Floral Sculptures & Global Village Pavilions",
    stops: [
      {
        time: "11:00 AM",
        place: "Dubai Miracle Garden",
        type: "Botanical Wonder",
        what_to_do: "Explore 150 million flowers arranged in arches, castles, and a full-size Emirates A380 display.",
        duration: "2.5 hours",
        cost_inr: "₹2,100 (AED 95)",
        tip: "Open seasonally from November to April.",
      },
      {
        time: "04:30 PM",
        place: "Global Village Multicultural Park",
        type: "Culture & Street Food",
        what_to_do: "Tour 90+ cultural country pavilions, witness international acrobat shows, and sample worldwide street food.",
        duration: "3 hours",
        cost_inr: "₹550 (AED 25)",
        tip: "Visit the India and Yemen pavilions for spices, saffron, and handicrafts.",
      },
    ],
    food: [
      { name: "Grand Dhaba, Global Village India Pavilion", cuisine: "Butter Chicken, Dal Makhani & Amritsari Kulcha", veg_friendly: true, cost_per_person_inr: "₹700 - ₹1,100" },
      { name: "Turkish Grand Bazaar Kiosk", cuisine: "Kunafa, Baklava & Turkish Dondurma Ice Cream", veg_friendly: true, cost_per_person_inr: "₹400 - ₹700" },
    ],
    transport: "RTA direct bus 105 or Dubai Careem / Uber taxi",
  },
];

function createInternationalDay(
  dest: string,
  dayNum: number,
  isVeg: boolean,
  isGermany: boolean,
  isSwiss: boolean,
  isDubai: boolean,
): DayPlan {
  if (isGermany) {
    const dayData = GERMANY_DAYS[(dayNum - 1) % GERMANY_DAYS.length];
    return {
      day: dayNum,
      title: `${dayData.title} (Day ${dayNum})`,
      stops: dayData.stops,
      food: dayData.food,
      transport: dayData.transport,
    };
  }

  if (isSwiss) {
    const dayData = SWISS_DAYS[(dayNum - 1) % SWISS_DAYS.length];
    return {
      day: dayNum,
      title: `${dayData.title} (Day ${dayNum})`,
      stops: dayData.stops,
      food: dayData.food,
      transport: dayData.transport,
    };
  }

  if (isDubai) {
    const dayData = DUBAI_DAYS[(dayNum - 1) % DUBAI_DAYS.length];
    return {
      day: dayNum,
      title: `${dayData.title} (Day ${dayNum})`,
      stops: dayData.stops,
      food: dayData.food,
      transport: dayData.transport,
    };
  }

  // Dynamic distinct international day generator
  const genericIntlThemes = [
    { title: "Arrival, Historic Cathedral & Grand Plaza", morning: "Historic Center & Grand Cathedral", aft: "Riverside Promenade & Panorama Deck" },
    { title: "Masterpiece Museums & Royal Heritage Bastions", morning: "National Art & Artifacts Gallery", aft: "Royal Gardens & Artisan Quarter" },
    { title: "Panoramic Skywalk & High-Elevation Observation Ridge", morning: "Sky Observation Tower", aft: "Sub-Alpine / Scenic Gorge Tram" },
    { title: "Culinary Markets, Traditional Food Halls & River Cruise", morning: "Century-Old Fresh Produce Market", aft: "Sunset River / Harbor Catamaran Cruise" },
    { title: "Medieval Countryside Hamlets & Vineyard Excursion", morning: "Historic Castle & Wine Terraces", aft: "Cobblestone Merchant Town Exploration" },
    { title: "Contemporary Architecture & Modern Arts District", morning: "Modern Design Museum & High-Tech Towers", aft: "Waterfront Boulevard & Open-Air Sculptures" },
    { title: "Artisan Boutiques, Heritage Shopping & Farewell Gastronomy", morning: "Historic Grand Arcades & Artisan Shops", aft: "Scenic Farewell Dinner with Skyline Views" },
  ];

  const theme = genericIntlThemes[(dayNum - 1) % genericIntlThemes.length];
  return {
    day: dayNum,
    title: `${theme.title} (${dest} - Day ${dayNum})`,
    stops: [
      {
        time: "10:00 AM",
        place: `${dest} ${theme.morning}`,
        type: "Architecture & History",
        what_to_do: `Explore the celebrated architectural marvels, grand corridors, and signature monuments of ${dest}.`,
        duration: "2.5 hours",
        cost_inr: "₹1,200 - ₹1,800",
        tip: "Download offline maps beforehand on Google Maps for smooth offline navigation.",
      },
      {
        time: "03:00 PM",
        place: `${dest} ${theme.aft}`,
        type: "Viewpoints",
        what_to_do: `Relax along the vibrant esplanade and capture golden hour skyline views of ${dest}.`,
        duration: "2 hours",
        cost_inr: "Free - ₹800",
        tip: "Ideal spot for afternoon coffee and people watching.",
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
        cuisine: isVeg ? "Continental Vegetarian & Pasta" : "Local European & Multi-Cuisine",
        veg_friendly: true,
        cost_per_person_inr: "₹1,800 - ₹2,800",
      },
    ],
    transport: "City metro or day transit pass",
  };
}
