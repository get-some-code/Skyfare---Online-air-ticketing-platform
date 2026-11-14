import { Suspense } from "react";
import { PlannerContainer } from "@/features/planner/components/planner-container";

export const metadata = {
  title: "AI Trip Planner | SkyFare",
  description: "Personalized day-by-day itineraries, flight arrival points, and estimated budgets in INR.",
};

export default function PlannerPage() {
  return (
    <main className="planner-main-page">
      <Suspense fallback={<div className="planner-page-skeleton">Loading AI Trip Planner...</div>}>
        <PlannerContainer />
      </Suspense>
    </main>
  );
}
