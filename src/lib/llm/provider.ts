import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * The LLM seam.
 *
 * One of the three interfaces (with the chronicle store and the database
 * client) that let the same code run as a free offline container stack and as a
 * Vercel deploy. Everything above this file is provider-agnostic.
 *
 * Ollama is reached through its OpenAI-compatible /v1 endpoint using the
 * official @ai-sdk/openai-compatible package rather than a third-party Ollama
 * provider — one less unmaintained dependency in the hot path.
 */

export type ProviderId = "ollama" | "groq";

export function activeProvider(): ProviderId {
  const raw = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();
  if (raw !== "ollama" && raw !== "groq") {
    throw new Error(
      `LLM_PROVIDER must be "ollama" or "groq", received "${raw}".`,
    );
  }
  return raw;
}

function ollamaModel() {
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  const modelId = process.env.OLLAMA_MODEL ?? "qwen3.5:2b";

  const ollama = createOpenAICompatible({
    name: "ollama",
    baseURL,
    // Ollama ignores the key but the OpenAI protocol requires the header.
    apiKey: "ollama",
  });

  return ollama(modelId);
}

function groqModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LLM_PROVIDER=groq but GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys",
    );
  }
  const modelId = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  return createGroq({ apiKey })(modelId);
}

/** The model that writes the campaign. */
export function narratorModel() {
  return activeProvider() === "groq" ? groqModel() : ollamaModel();
}

/**
 * Tuning per call site.
 *
 * The two providers need genuinely different budgets. Groq streams fast enough
 * that a long scene costs nothing in wall-clock time, whereas on a CPU-only
 * host every extra token is roughly a tenth of a second the player spends
 * watching a cursor. The local numbers are deliberately about half.
 */
export type CallProfile = {
  temperature: number;
  maxOutputTokens: number;
};

export function narrationProfile(): CallProfile {
  return activeProvider() === "groq"
    ? { temperature: 0.85, maxOutputTokens: 700 }
    : { temperature: 0.8, maxOutputTokens: 380 };
}

export function extractionProfile(): CallProfile {
  /* Low temperature: this call fills in a schema, it does not invent prose. */
  return activeProvider() === "groq"
    ? { temperature: 0.25, maxOutputTokens: 900 }
    : { temperature: 0.2, maxOutputTokens: 700 };
}

export function compactionProfile(): CallProfile {
  return activeProvider() === "groq"
    ? { temperature: 0.35, maxOutputTokens: 650 }
    : { temperature: 0.3, maxOutputTokens: 450 };
}

/**
 * How much campaign history to replay each turn.
 *
 * Groq's free tier is bound by tokens-per-minute rather than requests, and a
 * CPU-hosted model slows in direct proportion to context length. Both point the
 * same way: keep the window small and lean on the chronicle for everything
 * older. See src/lib/chronicle/compact.ts.
 */
export function verbatimTurnWindow(): number {
  return activeProvider() === "groq" ? 8 : 6;
}

/** Describes the active setup for the diagnostics endpoint. */
export function providerInfo() {
  const provider = activeProvider();
  return {
    provider,
    model:
      provider === "groq"
        ? (process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile")
        : (process.env.OLLAMA_MODEL ?? "qwen3.5:2b"),
    baseUrl:
      provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1"),
    configured: provider === "groq" ? Boolean(process.env.GROQ_API_KEY) : true,
  };
}
