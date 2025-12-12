import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ClaudeMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function callClaude(
  messages: ClaudeMessage[],
  options?: { maxTokens?: number },
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: options?.maxTokens ?? 1024,
    messages: messages.map(({ role, content }) => ({ role, content })),
  });

  const text =
    completion.content
      .map((part) => ("text" in part ? part.text : ""))
      .join("")
      .trim() ?? "";

  return text;
}
