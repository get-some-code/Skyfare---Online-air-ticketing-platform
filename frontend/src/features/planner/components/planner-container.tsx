"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-context";
import { Icon } from "@/components/ui/icon";
import {
  generateTripPlanApi,
  sendPlannerChatApi,
  type TripPlan,
  type TripState,
} from "@/lib/api/planner";
import { PlannerConversation } from "./planner-conversation";
import { PlannerLoading } from "./planner-loading";
import { PlannerResultView } from "./planner-result-view";

export function PlannerContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Initial params
  const paramDest = searchParams.get("destination") || "";
  const paramOrigin = searchParams.get("origin") || "";
  const paramDepart = searchParams.get("departure") || "";
  const paramReturn = searchParams.get("return") || "";
  const paramDays = searchParams.get("days") ? Number(searchParams.get("days")) : null;

  const [state, setState] = useState<TripState>(() => ({
    destination: paramDest || null,
    origin_city: paramOrigin || null,
    days: paramDays || null,
    dates_or_month: paramDepart ? `${paramDepart}${paramReturn ? ` to ${paramReturn}` : ""}` : null,
  }));

  const [question, setQuestion] = useState<string | null>(() => {
    if (paramDest) {
      if (paramOrigin && !paramDays) {
        return `How many days are you planning for your ${paramDest} trip?`;
      }
      if (paramOrigin && paramDays) {
        return `Your trip outline to ${paramDest} is ready. Would you like to build your complete day-by-day itinerary and itemized INR budget now?`;
      }
      return `Which city will you be departing from for ${paramDest}?`;
    }
    return "Where would you like to travel?";
  });

  const [chips, setChips] = useState<string[]>(() => {
    if (paramDest) {
      if (paramOrigin && !paramDays) {
        return ["3 Days", "5 Days", "7 Days", "10 Days"];
      }
      if (paramOrigin && paramDays) {
        return ["Generate Trip Plan", "Relaxed Pace", "Vegetarian Food", "Solo Trip"];
      }
      return ["Kolkata", "New Delhi", "Mumbai", "Bengaluru", "Chennai"];
    }
    return ["Manali", "Germany", "Goa", "Leh Ladakh", "Switzerland", "Dubai"];
  });

  const [progressPercent, setProgressPercent] = useState(() => {
    if (paramDest && paramOrigin && paramDays) return 100;
    if (paramDest && paramOrigin) return 60;
    if (paramDest) return 35;
    return 15;
  });

  const [isReadyToGenerate, setIsReadyToGenerate] = useState(() => {
    return Boolean(paramDest && paramOrigin && paramDays);
  });

  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  // 1. Auth Guard: Redirect unauthenticated users preserving query parameters
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const currentQuery = searchParams.toString();
      const currentPath = `/planner${currentQuery ? `?${currentQuery}` : ""}`;
      router.replace(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, authLoading, searchParams, router]);

  // 2. Initialize first turn when destination is prefilled
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || plan || initializedRef.current) return;
    initializedRef.current = true;
    let ignore = false;

    if (paramDest) {
      sendPlannerChatApi(paramDest, {
        destination: paramDest,
        origin_city: paramOrigin || null,
        days: paramDays || null,
      })
        .then((res) => {
          if (!ignore) {
            setState(res.state);
            setQuestion(res.question);
            setChips(res.chips);
            setProgressPercent(res.progress_percent);
            setIsReadyToGenerate(res.is_ready_to_generate);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            const msg = err instanceof Error ? err.message : "Failed to connect to trip planner.";
            if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
              setRateLimitExceeded(true);
            }
          }
        });
    }

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, plan, paramDest, paramOrigin, paramDays]);

  const initTurn = useCallback(async (initialDestination?: string) => {
    if (!isAuthenticated) return;
    setIsChatLoading(true);
    setError(null);
    try {
      const msg = initialDestination || paramDest || "Start trip plan";
      const res = await sendPlannerChatApi(msg, {
        destination: initialDestination || paramDest || null,
        origin_city: paramOrigin || null,
        days: paramDays || null,
      });
      setState(res.state);
      setQuestion(res.question);
      setChips(res.chips);
      setProgressPercent(res.progress_percent);
      setIsReadyToGenerate(res.is_ready_to_generate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to trip planner.";
      if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
        setRateLimitExceeded(true);
      } else {
        setError(msg);
      }
    } finally {
      setIsChatLoading(false);
    }
  }, [isAuthenticated, paramDest, paramOrigin, paramDays]);

  // Handle conversational response
  async function handleSendMessage(msg: string) {
    setIsChatLoading(true);
    setError(null);
    try {
      const res = await sendPlannerChatApi(msg, state);
      setState(res.state);
      setQuestion(res.question);
      setChips(res.chips);
      setProgressPercent(res.progress_percent);
      setIsReadyToGenerate(res.is_ready_to_generate);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Failed to process response.";
      if (m.includes("429") || m.toLowerCase().includes("rate limit")) {
        setRateLimitExceeded(true);
      } else {
        setError(m);
      }
    } finally {
      setIsChatLoading(false);
    }
  }

  // Handle final plan generation
  async function handleGeneratePlan() {
    setIsGenerating(true);
    setError(null);
    try {
      const [res] = await Promise.all([
        generateTripPlanApi(state),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
      setPlan(res.plan);
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Trip generation failed.";
      if (m.includes("429") || m.toLowerCase().includes("rate limit")) {
        setRateLimitExceeded(true);
      } else {
        setError(m);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function handleReset() {
    setState({});
    setPlan(null);
    setQuestion("Where would you like to travel?");
    setChips(["Manali", "Germany", "Goa", "Leh Ladakh", "Switzerland", "Dubai"]);
    setProgressPercent(15);
    setIsReadyToGenerate(false);
    setError(null);
    setRateLimitExceeded(false);
  }

  function handleEditField(field: keyof TripState) {
    setState((prev) => ({ ...prev, [field]: null }));
    setIsReadyToGenerate(false);
    const fieldLabels: Record<string, string> = {
      destination: "What is your desired destination?",
      days: "How many days will your trip be?",
      origin_city: "Which city will you depart from?",
      budget_tier: "What is your budget level?",
      group_type: "Who is travelling?",
      food_preference: "What is your dietary preference?",
      pace: "What travel pace do you prefer?",
    };
    setQuestion(fieldLabels[field] || `Please specify your ${field}:`);
    if (field === "budget_tier") setChips(["Budget", "Mid-range", "Premium"]);
    else if (field === "days") setChips(["3 Days", "5 Days", "7 Days", "10 Days"]);
    else if (field === "group_type") setChips(["Solo", "Couple", "Family", "Friends"]);
    else if (field === "food_preference") setChips(["Vegetarian", "Non-vegetarian", "Jain", "Halal"]);
    else if (field === "pace") setChips(["Relaxed", "Balanced", "Packed"]);
    else setChips([]);
  }

  if (authLoading) {
    return <div className="planner-auth-loading">Verifying authentication...</div>;
  }

  return (
    <div className="planner-page-wrapper">
      {/* Aurora Ambient Background */}
      <div className="planner-aurora-bg" aria-hidden="true" />

      <div className="planner-content-area">
        {/* Rate Limit Banner */}
        {rateLimitExceeded && (
          <div className="planner-banner planner-banner--warning" role="alert">
            <Icon name="shield" size={18} />
            <div>
              <strong>Hourly rate limit reached</strong>
              <p>You can generate up to 10 plans per hour. Please wait a few minutes before trying again.</p>
            </div>
          </div>
        )}

        {/* Generic Error Banner with Retry */}
        {error && (
          <div className="planner-banner planner-banner--error" role="alert">
            <Icon name="shield" size={18} />
            <div>
              <strong>Something went wrong</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => (isReadyToGenerate ? handleGeneratePlan() : initTurn())}
            >
              Retry
            </button>
          </div>
        )}

        {/* State 1: Generating Loading Shimmer */}
        {isGenerating ? (
          <PlannerLoading destination={state.destination || "your destination"} />
        ) : plan ? (
          /* State 2: Complete Result View */
          <PlannerResultView
            plan={plan}
            destination={state.destination || "Destination"}
            onModify={() => setPlan(null)}
          />
        ) : (
          /* State 3: Guided Step-by-Step Questions */
          <>
            <div className="planner-hero">
              <h1>AI Trip Planner</h1>
              <p>
                Name any destination. We will map the route, find where to land, and build an itemized budget in INR.
              </p>
            </div>

            <PlannerConversation
              state={state}
              question={question}
              chips={chips}
              progressPercent={progressPercent}
              isReadyToGenerate={isReadyToGenerate}
              isLoading={isChatLoading}
              onSendMessage={handleSendMessage}
              onGeneratePlan={handleGeneratePlan}
              onReset={handleReset}
              onEditField={handleEditField}
            />
          </>
        )}
      </div>
    </div>
  );
}
