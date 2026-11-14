"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { TripPlan } from "@/lib/api/planner";

interface PlannerResultViewProps {
  plan: TripPlan;
  destination: string;
  onModify: () => void;
}

export function PlannerResultView({
  plan,
  destination,
  onModify,
}: PlannerResultViewProps) {
  const [activeBudgetTier, setActiveBudgetTier] = useState<"low" | "medium" | "high">("medium");
  const [openDay, setOpenDay] = useState<number | null>(1);

  const budgetData = plan.budget[activeBudgetTier];

  // Build the flight search link URL
  const { origin_iata, destination_iata, depart_date, return_date, passengers } = plan.flight_search;
  const flightSearchUrl = `/flights/search?origin=${encodeURIComponent(origin_iata)}&destination=${encodeURIComponent(destination_iata)}&departure=${encodeURIComponent(depart_date)}&return=${encodeURIComponent(return_date)}&travellers=${passengers}&tripType=round-trip`;

  function toggleDay(dayNum: number) {
    setOpenDay((prev) => (prev === dayNum ? null : dayNum));
  }

  return (
    <div className="planner-result-layout">
      {/* Overview & Quick Actions Header */}
      <div className="planner-result-header">
        <div className="planner-result-header__title-wrap">
          <div className="planner-result-meta-row">
            <span className="planner-meta-badge">
              <Icon name="calendar" size={14} />
              {plan.days.length} Days
            </span>
            <span className="planner-meta-badge">
              <Icon name="compass" size={14} />
              Best Season: {plan.best_time}
            </span>
          </div>
          <h1>Custom Plan for {destination}</h1>
          <p className="planner-result-overview">{plan.overview}</p>
        </div>

        <div className="planner-result-header__actions">
          <Link
            href={flightSearchUrl}
            className="button button--primary planner-flight-cta-top"
          >
            <Icon name="plane" size={18} />
            Search Flights for this Trip
          </Link>
          <button
            type="button"
            className="button button--secondary"
            onClick={onModify}
          >
            Modify Preferences
          </button>
        </div>
      </div>

      <div className="planner-result-grid">
        {/* Main Column: Arrival Logistics, Day-by-Day Itinerary, Indian Traveller Mode */}
        <div className="planner-result-main">
          {/* Feature 2: Where to Land & How to Move */}
          <section className="planner-card planner-arrival-card" aria-labelledby="arrival-heading">
            <div className="planner-card__header">
              <span className="planner-card__icon" aria-hidden="true">
                <Icon name="plane" size={20} />
              </span>
              <div>
                <h2 id="arrival-heading">Where to Land &amp; How to Move</h2>
                <p>Transit corridors, airport choices, and onward connectivity</p>
              </div>
            </div>

            <div className="planner-arrival-body">
              <div className="planner-arrival-highlight">
                <span className="planner-arrival-kicker">Recommended Arrival</span>
                <h3>{plan.arrival.recommended}</h3>
                <p>{plan.arrival.reason}</p>
                {plan.arrival.alternatives && plan.arrival.alternatives.length > 0 && (
                  <div className="planner-arrival-alternatives">
                    <span>Alternative Hubs: </span>
                    <strong>{plan.arrival.alternatives.join(", ")}</strong>
                  </div>
                )}
              </div>

              {plan.arrival.onward_transport && plan.arrival.onward_transport.length > 0 && (
                <div className="planner-onward-transport">
                  <h4>Onward Transit Options</h4>
                  <div className="planner-onward-grid">
                    {plan.arrival.onward_transport.map((opt, i) => (
                      <div key={i} className="planner-onward-item">
                        <strong className="planner-onward-mode">{opt.mode}</strong>
                        <span className="planner-onward-meta">
                          {opt.duration} · {opt.cost_inr}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.route_summary && (
                <div className="planner-route-summary">
                  <h4>Route &amp; Pass Logistics</h4>
                  <p>{plan.route_summary}</p>
                </div>
              )}
            </div>
          </section>

          {/* Feature 3: Day-by-Day Itinerary */}
          <section className="planner-card planner-itinerary-card" aria-labelledby="itinerary-heading">
            <div className="planner-card__header">
              <span className="planner-card__icon" aria-hidden="true">
                <Icon name="compass" size={20} />
              </span>
              <div>
                <h2 id="itinerary-heading">Day-by-Day Itinerary</h2>
                <p>Pinpoint stops, scenic passes, viewpoints, and verified food spots</p>
              </div>
            </div>

            <div className="planner-days-accordion">
              {plan.days.map((day) => {
                const isOpen = openDay === day.day;
                return (
                  <article
                    key={day.day}
                    className={`planner-day-card ${isOpen ? "is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="planner-day-card__trigger"
                      onClick={() => toggleDay(day.day)}
                      aria-expanded={isOpen}
                    >
                      <span className="planner-day-pill">Day {day.day}</span>
                      <strong className="planner-day-title">{day.title}</strong>
                      <span className="planner-day-chevron" aria-hidden="true">
                        <Icon name={isOpen ? "chevron-down" : "chevron-right"} size={18} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="planner-day-card__content">
                        {/* Timed Stops Timeline */}
                        <div className="planner-timeline">
                          {day.stops.map((stop, sIdx) => (
                            <div key={sIdx} className="planner-timeline-node">
                              <div className="planner-timeline-time">{stop.time}</div>
                              <div className="planner-timeline-body">
                                <div className="planner-timeline-title-row">
                                  <h4>{stop.place}</h4>
                                  <span className="planner-timeline-type">{stop.type}</span>
                                </div>
                                <p className="planner-timeline-action">{stop.what_to_do}</p>
                                <div className="planner-timeline-meta-row">
                                  <span>Duration: {stop.duration}</span>
                                  <span>Est. Cost: {stop.cost_inr}</span>
                                </div>
                                {stop.tip && (
                                  <div className="planner-timeline-tip">
                                    <Icon name="spark" size={14} />
                                    <span>Tip: {stop.tip}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Food Recommendations */}
                        {day.food && day.food.length > 0 && (
                          <div className="planner-food-section">
                            <h4>Dining &amp; Local Specialities</h4>
                            <div className="planner-food-grid">
                              {day.food.map((item, fIdx) => (
                                <div key={fIdx} className="planner-food-card">
                                  <div className="planner-food-header">
                                    <strong>{item.name}</strong>
                                    {item.veg_friendly && (
                                      <span className="planner-veg-tag" title="Vegetarian friendly">
                                        Pure Veg / Veg Friendly
                                      </span>
                                    )}
                                  </div>
                                  <span className="planner-food-cuisine">{item.cuisine}</span>
                                  <span className="planner-food-cost">
                                    Approx. {item.cost_per_person_inr} / person
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transport */}
                        {day.transport && (
                          <div className="planner-day-transport">
                            <span>Daily Commute: </span>
                            <strong>{day.transport}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* Feature 4: Indian Traveller Mode */}
          <section className="planner-card planner-indian-mode-card" aria-labelledby="indian-mode-heading">
            <div className="planner-card__header">
              <span className="planner-card__icon" aria-hidden="true">
                <Icon name="shield" size={20} />
              </span>
              <div>
                <h2 id="indian-mode-heading">Indian Traveller Mode (Always On)</h2>
                <p>Permits, forex &amp; card rules, SIM connectivity, and local advisories</p>
              </div>
            </div>

            <div className="planner-indian-grid">
              <div className="planner-indian-cell">
                <strong>Visa, Permits &amp; ILP</strong>
                <p>{plan.indian_traveller.visa_or_permits}</p>
              </div>
              <div className="planner-indian-cell">
                <strong>Money, UPI &amp; Forex</strong>
                <p>{plan.indian_traveller.money}</p>
              </div>
              <div className="planner-indian-cell">
                <strong>Mobile Network &amp; eSIM</strong>
                <p>{plan.indian_traveller.connectivity}</p>
              </div>
              <div className="planner-indian-cell">
                <strong>Power &amp; Voltage</strong>
                <p>{plan.indian_traveller.power}</p>
              </div>
              <div className="planner-indian-cell">
                <strong>Vegetarian &amp; Jain Food</strong>
                <p>{plan.indian_traveller.food}</p>
              </div>
              <div className="planner-indian-cell">
                <strong>Safety &amp; Acclimatisation</strong>
                <p>{plan.indian_traveller.safety}</p>
              </div>
            </div>

            {plan.seasonal_advisory && plan.seasonal_advisory.length > 0 && (
              <div className="planner-seasonal-advisory">
                <h4>Seasonal Advisory &amp; Road Closures</h4>
                <ul>
                  {plan.seasonal_advisory.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar Sticky Panel: Budget Breakdown & Flight Search */}
        <aside className="planner-result-sidebar">
          <div className="planner-sticky-panel">
            {/* Budget Table */}
            <div className="planner-budget-card">
              <div className="planner-budget-card__header">
                <h3>Estimated Budget in INR</h3>
                <p>Costs are approximate ranges per person</p>
              </div>

              {/* Low / Medium / High Tabs */}
              <div className="planner-budget-tabs" role="tablist">
                {(["low", "medium", "high"] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    role="tab"
                    aria-selected={activeBudgetTier === tier}
                    className={`planner-budget-tab ${activeBudgetTier === tier ? "is-active" : ""}`}
                    onClick={() => setActiveBudgetTier(tier)}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </button>
                ))}
              </div>

              <div className="planner-budget-table">
                <div className="planner-budget-row">
                  <span>Local Travel &amp; Cabs</span>
                  <strong>{budgetData.local_travel}</strong>
                </div>
                <div className="planner-budget-row">
                  <span>Accommodation / Stay</span>
                  <strong>{budgetData.stay}</strong>
                </div>
                <div className="planner-budget-row">
                  <span>Food &amp; Dining</span>
                  <strong>{budgetData.food}</strong>
                </div>
                <div className="planner-budget-row">
                  <span>Sightseeing &amp; Passes</span>
                  <strong>{budgetData.sightseeing}</strong>
                </div>
                <div className="planner-budget-row">
                  <span>Activities &amp; Adventure</span>
                  <strong>{budgetData.activities}</strong>
                </div>
                <div className="planner-budget-row">
                  <span>Miscellaneous</span>
                  <strong>{budgetData.misc}</strong>
                </div>
                <div className="planner-budget-row planner-budget-row--total">
                  <span>Total Estimated Land Cost</span>
                  <strong>{budgetData.total}</strong>
                </div>
              </div>

              {plan.budget.approx_flights_inr && (
                <div className="planner-flight-estimate">
                  <span>Estimated Flights (Roundtrip):</span>
                  <strong>{plan.budget.approx_flights_inr}</strong>
                </div>
              )}
            </div>

            {/* Feature 5: Flight Action */}
            <div className="planner-flight-cta-box">
              <h3>Ready to lock in your flight?</h3>
              <p>
                Compare real-time airline fares with guaranteed pricing and corporate GST invoices.
              </p>
              <Link href={flightSearchUrl} className="button button--primary planner-flight-btn-sidebar">
                <Icon name="plane" size={18} />
                Search Flights for this Trip
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>

            {/* Disclaimer */}
            <div className="planner-disclaimer">
              <p>{plan.disclaimer}</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="planner-mobile-sticky-bar">
        <div className="planner-mobile-sticky-bar__info">
          <span>Total Land Cost:</span>
          <strong>{budgetData.total}</strong>
        </div>
        <Link href={flightSearchUrl} className="button button--primary planner-mobile-sticky-bar__btn">
          <Icon name="plane" size={16} />
          Search Flights
        </Link>
      </div>
    </div>
  );
}
