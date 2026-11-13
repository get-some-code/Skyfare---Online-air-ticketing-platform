import { apiRequest } from "./client";

export interface ChatOption {
  label: string;
  value: string;
  action?: "reply" | "search";
  url?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  options?: ChatOption[];
}

export interface ChatResponse {
  reply: string;
  provider: string;
  status: string;
  options?: ChatOption[];
}

export async function sendConciergeMessageApi(messages: ChatMessage[]): Promise<ChatResponse> {
  const payload = messages.map(({ role, content }) => ({ role, content }));
  return apiRequest<ChatResponse>("concierge/chat", {
    method: "POST",
    body: JSON.stringify({ messages: payload }),
  });
}
