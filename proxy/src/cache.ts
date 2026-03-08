const SIMILARITY_THRESHOLD = 0.85;
const MAX_CACHE_SIZE = 1000;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  key: string;
  textEmbed: Map<string, number>;
  response: unknown;
  createdAt: number;
  lastAccessedAt: number;
  hits: number;
}

class SemanticCache {
  private entries: Map<string, CacheEntry> = new Map();
  private totalHits = 0;
  private totalMisses = 0;

  private embed(text: string): Map<string, number> {
    const tokens = text.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    const freq = new Map<string, number>();
    tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
    return freq;
  }

  private cosineSimilarity(
    a: Map<string, number>,
    b: Map<string, number>
  ): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, countA] of a) {
      dotProduct += countA * (b.get(term) || 0);
      normA += countA * countA;
    }
    for (const [, countB] of b) {
      normB += countB * countB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.createdAt > TTL_MS) {
        this.entries.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey);
    }
  }

  get(text: string): { hit: boolean; response?: unknown; key?: string } {
    this.evictExpired();
    const queryEmb = this.embed(text);
    let bestSim = 0;
    let bestEntry: CacheEntry | null = null;

    for (const entry of this.entries.values()) {
      const sim = this.cosineSimilarity(queryEmb, entry.textEmbed);
      if (sim > bestSim) {
        bestSim = sim;
        bestEntry = entry;
      }
    }

    if (bestEntry && bestSim >= SIMILARITY_THRESHOLD) {
      bestEntry.hits++;
      bestEntry.lastAccessedAt = Date.now();
      this.totalHits++;
      return { hit: true, response: bestEntry.response, key: bestEntry.key };
    }

    this.totalMisses++;
    return { hit: false };
  }

  set(text: string, key: string, response: unknown): void {
    this.evictExpired();
    if (this.entries.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    const now = Date.now();
    this.entries.set(key, {
      key,
      textEmbed: this.embed(text),
      response,
      createdAt: now,
      lastAccessedAt: now,
      hits: 0,
    });
  }

  getStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.entries.size,
      hits: this.totalHits,
      misses: this.totalMisses,
    };
  }

  clear(): void {
    this.entries.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }
}

export const semanticCache = new SemanticCache();
