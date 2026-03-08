const PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  // Anthropic
  'claude-opus-4-6': { input: 5.0, output: 25.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Try exact match first, then prefix match
  let pricing = PRICING[model];
  if (!pricing) {
    const modelLower = model.toLowerCase();
    for (const [key, val] of Object.entries(PRICING)) {
      if (modelLower.startsWith(key) || key.startsWith(modelLower)) {
        pricing = val;
        break;
      }
    }
  }
  if (!pricing) {
    pricing = { input: 1.0, output: 3.0 }; // fallback
  }
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}
