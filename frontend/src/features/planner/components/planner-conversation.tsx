"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { TripState } from "@/lib/api/planner";

interface PlannerConversationProps {
  state: TripState;
  question: string | null;
  chips: string[];
  progressPercent: number;
  isReadyToGenerate: boolean;
  isLoading: boolean;
  onSendMessage: (msg: string) => void;
  onGeneratePlan: () => void;
  onReset: () => void;
  onEditField: (field: keyof TripState) => void;
}

export function PlannerConversation({
  state,
  question,
  chips,
  progressPercent,
  isReadyToGenerate,
  isLoading,
  onSendMessage,
  onGeneratePlan,
  onReset,
  onEditField,
}: PlannerConversationProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [question, chips, isReadyToGenerate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    setInputText("");
    onSendMessage(trimmed);
  }

  function handleChipClick(chip: string) {
    if (isLoading) return;
    if (chip === "Generate Trip Plan" || chip === "Generate Plan") {
      onGeneratePlan();
      return;
    }
    onSendMessage(chip);
  }

  // Answered tags for quick review and editing
  const answeredItems = [
    { label: "Destination", value: state.destination, key: "destination" as const },
    { label: "Duration", value: state.days ? `${state.days} Days` : null, key: "days" as const },
    { label: "From", value: state.origin_city, key: "origin_city" as const },
    { label: "Budget", value: state.budget_tier, key: "budget_tier" as const },
    { label: "Group", value: state.group_type, key: "group_type" as const },
    { label: "Food", value: state.food_preference, key: "food_preference" as const },
    { label: "Pace", value: state.pace, key: "pace" as const },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="planner-convo-card">
      {/* Slim Progress Bar */}
      <div className="planner-progress-wrap" aria-label="Trip planning progress">
        <div className="planner-progress-header">
          <span className="planner-progress-label">Trip Details Progress</span>
          <span className="planner-progress-value">{progressPercent}%</span>
        </div>
        <div className="planner-progress-track">
          <div
            className="planner-progress-bar"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Answered Tags Bar */}
      {answeredItems.length > 0 && (
        <div className="planner-summary-tags" aria-label="Selected parameters">
          <div className="planner-summary-tags__list">
            {answeredItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className="planner-summary-tag"
                onClick={() => onEditField(item.key)}
                title={`Click to edit ${item.label}`}
              >
                <span className="planner-summary-tag__label">{item.label}:</span>
                <strong className="planner-summary-tag__val">{item.value}</strong>
                <span className="planner-summary-tag__edit">✕</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-button planner-start-over"
            onClick={onReset}
          >
            Start over
          </button>
        </div>
      )}

      {/* Active AI Prompt */}
      <div className="planner-convo-body">
        <div className="planner-ai-question">
          <div className="planner-ai-question__avatar" aria-hidden="true">
            <Icon name="spark" size={18} />
          </div>
          <div className="planner-ai-question__bubble">
            <p className="planner-ai-question__text">
              {question || "Where would you like to travel?"}
            </p>
          </div>
        </div>

        {/* Tappable Chips */}
        {chips && chips.length > 0 && (
          <div className="planner-chips-container" aria-label="Suggested choices">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`planner-chip ${
                  chip === "Generate Trip Plan" || chip === "Generate Plan"
                    ? "planner-chip--primary"
                    : ""
                }`}
                onClick={() => handleChipClick(chip)}
                disabled={isLoading}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {isReadyToGenerate && (
          <div className="planner-ready-action">
            <button
              type="button"
              className="button button--primary button--large planner-ready-btn"
              onClick={onGeneratePlan}
              disabled={isLoading}
            >
              Generate Complete Itinerary &amp; Budget
              <Icon name="arrow-right" size={18} />
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Free-text Input Bar */}
      <form className="planner-convo-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="planner-convo-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type an answer or custom requirement..."
          disabled={isLoading}
          aria-label="Your response"
        />
        <button
          type="submit"
          className="planner-convo-send-btn"
          disabled={!inputText.trim() || isLoading}
          aria-label="Send answer"
        >
          <Icon name="arrow-right" size={18} />
        </button>
      </form>
    </div>
  );
}
