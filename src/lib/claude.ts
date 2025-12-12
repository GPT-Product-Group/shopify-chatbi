// src/lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

type MyMessage = { role: "user" | "assistant" | "system"; content: string };

let anthropicClient: Anthropic | null = null;

function getAnthropicClient() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error("Missing ANTHROPIC_API_KEY environment variable");
    }
    if (!anthropicClient) {
        anthropicClient = new Anthropic({ apiKey });
    }
    return anthropicClient;
}

export async function callClaude(
    messages: MyMessage[],
    options?: { maxTokens?: number }
) {
    const client = getAnthropicClient();

    const system = messages
        .filter(m => m.role === "system")
        .map(m => m.content)
        .join("\n\n");

    const chatMessages = messages
        .filter((m): m is { role: "user" | "assistant"; content: string } => m.role !== "system")
        .map(({ role, content }) => ({ role, content }));

    const resp = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: options?.maxTokens ?? 1024,
        system: system || undefined,     // ✅ system 放这里
        messages: chatMessages,          // ✅ 这里只能 user/assistant
    });

    const text = (resp.content as Message["content"])
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("");

    return text;
}
