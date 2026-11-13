import { apiRequest } from "./client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  reply: string;
  provider: string;
  status: string;
}

export async function sendConciergeMessageApi(messages: ChatMessage[]): Promise<ChatResponse> {
  return apiRequest<ChatResponse>("concierge/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
}
