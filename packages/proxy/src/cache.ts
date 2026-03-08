/**
 * Semantic in-memory cache using cosine similarity on simple TF-IDF-style embeddings.
 *
 * For a production system you'd use a real embedding model, but this illustrates
 * the pattern without any API calls and keeps latency at zero.
 */

import { createHash } from 'crypto';

// ─── Simple bag-of-words embedding ───────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildVocab(tokens: string[]): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const t of tokens) {
    if (!map.has(t)) map.set(t, idx++);
  }
  return map;
}

function embed(text: string, vocab: Map<string, number>): number[] {
  const vec = new Array(vocab.size).fill(0);
  const tokens = tokenize(text);
  for (const t of tokens) {
    const i = vocab.get(t);
    if (i !== undefined) vec[i] += 1;
  }
  return vec;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Cache entry ─────────────────────────────────────────────────────────

interface Entry {
  key: string;
  text: string;
  embedding: number[];
  response: unknown;
  model: string;
  createdAt: number;
  hitCount: number;
}

// ─── SemanticCache ────────────────────────────────────────────────────────

export class SemanticCache {
  private entries: Entry[] = [];
  private vocab: Map<string, number> = new Map();
  private readonly maxEntries: number;
  private readonly threshold: number;

  constructor(maxEntries = 500, threshold = 0.92) {
    this.maxEntries = maxEntries;
    this.threshold = threshold;
  }

  /** Deterministic hash of the request body for exact dedup */
  static hashRequest(body: unknown): string {
    return createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 16);
  }

  /** Extract the user-visible text from an OpenAI-style messages array */
  static extractText(body: Record<string, unknown>): string {
    const messages = (body.messages as Array<{ role: string; content: string | unknown }>) ?? [];
    return messages.map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join(' ');
  }

  private rebuildEmbeddings(): void {
    // Rebuild vocab from all stored texts
    const allTokens = this.entries.flatMap(e => tokenize(e.text));
    this.vocab = buildVocab(allTokens);
    // Re-embed all entries
    for (const e of this.entries) {
      e.embedding = embed(e.text, this.vocab);
    }
  }

  /** Find the best matching cached entry. Returns null if below threshold. */
  lookup(text: string, model: string): { entry: Entry; similarity: number } | null {
    if (this.entries.length === 0) return null;
    const vec = embed(text, this.vocab);
    let best: Entry | null = null;
    let bestSim = -1;

    for (const e of this.entries) {
      if (e.model !== model) continue;
      const sim = cosine(vec, e.embedding);
      if (sim > bestSim) {
        bestSim = sim;
        best = e;
      }
    }

    if (best && bestSim >= this.threshold) {
      best.hitCount++;
      return { entry: best, similarity: bestSim };
    }
    return null;
  }

  /** Store a new response in the cache. */
  store(key: string, text: string, model: string, response: unknown): void {
    // Evict oldest if at capacity
    if (this.entries.length >= this.maxEntries) {
      this.entries.sort((a, b) => a.createdAt - b.createdAt);
      this.entries.splice(0, Math.ceil(this.maxEntries * 0.1)); // evict 10%
    }

    // Update vocab with new tokens
    const newTokens = tokenize(text);
    let vocabChanged = false;
    for (const t of newTokens) {
      if (!this.vocab.has(t)) {
        this.vocab.set(t, this.vocab.size);
        vocabChanged = true;
      }
    }

    // If vocab grew, re-embed everything (expensive but rare in practice)
    if (vocabChanged && this.entries.length > 0) {
      this.rebuildEmbeddings();
    }

    this.entries.push({
      key,
      text,
      embedding: embed(text, this.vocab),
      response,
      model,
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  get size(): number {
    return this.entries.length;
  }

  getStats() {
    const totalHits = this.entries.reduce((s, e) => s + e.hitCount, 0);
    return {
      entries: this.entries.length,
      totalHits,
      vocabSize: this.vocab.size,
    };
  }
}

// Singleton
export const cache = new SemanticCache(
  parseInt(process.env.CACHE_MAX_ENTRIES ?? '500', 10),
  parseFloat(process.env.CACHE_THRESHOLD ?? '0.92'),
);
