"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { type ChatMessage, type ChatOption, sendConciergeMessageApi } from "@/lib/api/concierge";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hello! I am SkyBot, your 24/7 aviation & flight concierge at SkyFare! ✈️✨ " +
      "I'm here exclusively to assist you with flight discovery, suitable routes, custom travel itineraries, airport guides, and bookings. " +
      "How may I assist your journey today?",
    options: [
      { label: "✈️ Delhi to Kolkata Flights", value: "del to ccu flights" },
      { label: "🗺️ Suitable Routes to Dubai", value: "What are suitable routes to Dubai?" },
      { label: "🏖️ 4-Day Itinerary for Goa", value: "Suggest a 4-day travel itinerary for Goa" },
      { label: "🧳 Baggage Allowance", value: "What are the baggage allowances on Business Class?" },
    ],
  },
];

const QUICK_PROMPTS = [
  "What are suitable flight routes to Dubai?",
  "Suggest a 4-day travel itinerary for Goa",
  "What are the baggage allowances on Business Class?",
  "How does Corporate GST invoicing work?",
  "Which terminal at Delhi (DEL) handles international flights?",
];

function renderFormattedText(text: string) {
  // Clean up any double bullet asterisks and dangling markers
  const cleaned = text
    .replace(/\*\s*\*\*/g, "\n• **")
    .replace(/(?<=\s)\*(?=\s)/g, "");

  const lines = cleaned.split("\n");

  return (
    <div className="skybot-text-body">
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lineIdx} className="skybot-text-spacer" />;
        }

        const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const lineContent = isBullet ? trimmed.replace(/^[•\-\*]\s*/, "") : trimmed;

        // Parse **bold** parts and [label](url) markdown links cleanly
        const parts = lineContent.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
        const renderedParts = parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
            return (
              <strong key={partIdx} className="skybot-bold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
          if (linkMatch) {
            const [, linkText, linkUrl] = linkMatch;
            return (
              <a
                key={partIdx}
                href={linkUrl}
                className="skybot-inline-link"
                target={linkUrl.startsWith("http") ? "_blank" : undefined}
                rel={linkUrl.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {linkText}
              </a>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="skybot-bullet-item">
              <span className="skybot-bullet-dot">•</span>
              <span className="skybot-bullet-text">{renderedParts}</span>
            </div>
          );
        }

        return (
          <p key={lineIdx} className="skybot-paragraph">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
}

export function ConciergeChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string>("dual-ai");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isLoading]);

  async function handleSend(textToSend?: string) {
    const userText = (textToSend ?? input).trim();
    if (!userText || isLoading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await sendConciergeMessageApi(newMessages);
      setMessages([
        ...newMessages,
        { role: "assistant", content: res.reply, options: res.options },
      ]);
      setActiveProvider(res.provider);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            "I apologize, our concierge systems encountered a brief network interruption. " +
            "Please try asking your question again or call our 24/7 priority line at +1 800 SKY-FARE.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOptionSelect(opt: ChatOption) {
    if (opt.action === "search" && opt.url) {
      router.push(opt.url);
      return;
    }
    handleSend(opt.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    setMessages(INITIAL_MESSAGES);
  }

  return (
    <div className="concierge-widget" aria-label="SkyFare AI Concierge">
      {/* Floating Teaser Bubble */}
      {!isOpen && showTeaser && (
        <div className="concierge-teaser" role="status">
          <div
            className="concierge-teaser__content"
            onClick={() => {
              setIsOpen(true);
              setShowTeaser(false);
            }}
          >
            <span className="concierge-teaser__badge">24/7 AI Concierge</span>
            <p>Hi! I&apos;m SkyBot ✈️ Click me for flight routes, itineraries, or airport guides!</p>
          </div>
          <button
            type="button"
            className="concierge-teaser__close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTeaser(false);
            }}
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Trigger - Cute SkyBot Robot Avatar */}
      {!isOpen && (
        <button
          type="button"
          className="skybot-floating-trigger"
          onClick={() => {
            setIsOpen(true);
            setShowTeaser(false);
          }}
          aria-expanded={isOpen}
          aria-label="Chat with SkyBot"
        >
          <div className="skybot-avatar-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/skybot.png"
              alt="SkyBot AI Concierge"
              className="skybot-avatar-img"
              width={64}
              height={64}
            />
            <span className="skybot-online-badge" aria-label="Online" />
          </div>
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          className="concierge-window"
          role="dialog"
          aria-label="SkyFare Executive Concierge Chat"
        >
          {/* Header */}
          <div className="concierge-window__header">
            <div className="concierge-window__brand">
              <div className="skybot-header-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/skybot.png"
                  alt="SkyBot"
                  width={38}
                  height={38}
                />
              </div>
              <div>
                <strong className="concierge-title">SkyBot</strong>
              </div>
            </div>

            <div className="concierge-window__header-actions">
              <button
                type="button"
                className="concierge-icon-btn"
                onClick={handleReset}
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                ↺
              </button>
              <button
                type="button"
                className="concierge-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="concierge-window__body">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`concierge-msg concierge-msg--${m.role}`}
              >
                {m.role === "assistant" && (
                  <span className="concierge-msg__avatar skybot-msg-avatar">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/skybot.png"
                      alt="SkyBot"
                      width={28}
                      height={28}
                    />
                  </span>
                )}
                <div className="concierge-msg__bubble">
                  {renderFormattedText(m.content)}
                  {m.role === "assistant" && m.options && m.options.length > 0 && (
                    <div className="skybot-options-container">
                      <div className="skybot-options-list">
                        {m.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            className={`skybot-option-chip ${opt.action === "search" ? "skybot-option-chip--action" : ""}`}
                            onClick={() => handleOptionSelect(opt)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="concierge-msg concierge-msg--assistant">
                <span className="concierge-msg__avatar skybot-msg-avatar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/skybot.png"
                    alt="SkyBot"
                    width={28}
                    height={28}
                  />
                </span>
                <div className="concierge-msg__bubble concierge-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (visible if conversation is short) */}
          {messages.length <= 2 && (
            <div className="concierge-quick-prompts">
              <span className="concierge-quick-prompts__label">Suggested inquiries:</span>
              <div className="concierge-quick-prompts__list">
                {QUICK_PROMPTS.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="concierge-quick-pill"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="concierge-window__footer">
            <input
              ref={inputRef}
              type="text"
              className="concierge-input"
              placeholder="Ask about flights, routes, itineraries, airports…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              aria-label="Message to SkyFare Concierge"
            />
            <button
              type="button"
              className="concierge-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <Icon name="search" size={16} />
            </button>
          </div>

          {/* Provider Footer Notice */}
          <div className="concierge-disclaimer">
            <span>Verified AI Aviation Knowledge · Active provider: {activeProvider}</span>
          </div>
        </div>
      )}
    </div>
  );
}
