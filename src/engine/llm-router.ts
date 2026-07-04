import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChatMessage } from './types';

export interface LlmProvider {
  name: string;
  chat(messages: ChatMessage[]): Promise<string>;
}

export class GroqProvider implements LlmProvider {
  name = 'groq';
  private client: Groq;
  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      // Warmth/variety without wandering; token cap keeps replies text-length
      // short even if the model ignores the "one or two sentences" instruction.
      temperature: 0.8,
      max_tokens: 120,
    });
    return res.choices[0]?.message?.content ?? '';
  }
}

export class GeminiProvider implements LlmProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      // Parity with Groq -- without this Gemini has no length/temp control, so
      // the brevity persona is the only brake on it. Belt and suspenders.
      generationConfig: { temperature: 0.8, maxOutputTokens: 120 },
    });
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const rest = messages.filter((m) => m.role !== 'system');
    const prompt = [system, ...rest.map((m) => `${m.role}: ${m.content}`)].join('\n\n');
    const res = await model.generateContent(prompt);
    return res.response.text();
  }
}

/** Sliding-window RPM limiter. Groq's free tier is ~30 RPM shared across ALL
 * concurrent students on one key, not per-student -- this is what actually
 * caps capacity during a login spike, not the daily quota. */
class RateWindow {
  private timestamps: number[] = [];
  constructor(private limitPerMinute: number) {}
  tryConsume(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length >= this.limitPerMinute) return false;
    this.timestamps.push(now);
    return true;
  }
}

export interface LlmRouterOptions {
  scriptedFallback: (messages: ChatMessage[]) => string;
}

export interface LlmChatResult {
  text: string;
  provider: string;
}

export class LlmRouter {
  private providers: { provider: LlmProvider; limiter: RateWindow }[] = [];
  private cache = new Map<string, string>();
  private rrIndex = 0;

  constructor(private opts: LlmRouterOptions) {}

  register(provider: LlmProvider, rpm: number) {
    this.providers.push({ provider, limiter: new RateWindow(rpm) });
  }

  get providerCount(): number {
    return this.providers.length;
  }

  /** Round-robins across providers under their rate limit; falls through to
   * the next provider on error/exhaustion; scripted response is the last resort
   * so the bot never hard-fails mid-conversation. */
  async chat(messages: ChatMessage[]): Promise<LlmChatResult> {
    const underLimit = this.providers.filter((p) => p.limiter.tryConsume());
    const ordered = underLimit.length ? underLimit : this.providers;

    for (let i = 0; i < ordered.length; i++) {
      const idx = (this.rrIndex + i) % ordered.length;
      const { provider } = ordered[idx];
      try {
        const text = (await provider.chat(messages)).trim();
        // An empty/whitespace completion is a "success" over the wire but a
        // blank speech bubble to the student -- llama-3.1-8b returns one every
        // so often. Treat it as a miss and fall through to the next provider,
        // then to the scripted line, so the bot never renders nothing.
        if (!text) continue;
        this.rrIndex = (idx + 1) % ordered.length;
        return { text, provider: provider.name };
      } catch {
        continue;
      }
    }
    return { text: this.opts.scriptedFallback(messages), provider: 'scripted-fallback' };
  }

  /** Templates/caches small-input-space LLM turns (e.g. milestone celebrations)
   * so repeat scenarios skip the API entirely -- part of staying under the
   * free-tier concurrency ceiling. */
  async chatCached(key: string, messages: ChatMessage[]): Promise<LlmChatResult> {
    const cached = this.cache.get(key);
    if (cached) return { text: cached, provider: 'cache' };
    const result = await this.chat(messages);
    this.cache.set(key, result.text);
    return result;
  }
}

export function createDefaultRouter(): LlmRouter {
  const router = new LlmRouter({
    scriptedFallback: () =>
      "Tell me more about that -- I'm listening, even if my AI brain is taking a quick breather!",
  });
  if (process.env.GROQ_API_KEY) {
    // stay under the ~30 RPM free-tier ceiling
    router.register(new GroqProvider(process.env.GROQ_API_KEY), 25);
  }
  if (process.env.GEMINI_API_KEY) {
    // 1,500 req/day free tier, paced conservatively per-minute
    router.register(new GeminiProvider(process.env.GEMINI_API_KEY), 10);
  }
  return router;
}
