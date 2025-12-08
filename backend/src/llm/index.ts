import { LLMClient } from './LLMClient';
import { MockLLMClient } from './MockLLMClient';
import { OpenAiLLMClient } from './OpenAiLLMClient';
import { SafeLLMClient } from './SafeLLMClient';
import { config } from '../config';

const clientCache = new Map<string, LLMClient>();

export function getLLMClient(modeOverride?: 'mock' | 'openai' | null): LLMClient {
  // Use override if provided, otherwise use global config
  const mode = modeOverride !== undefined && modeOverride !== null ? modeOverride : config.llm.mode;
  const cacheKey = mode || 'default';

  if (!clientCache.has(cacheKey)) {
    let primary: LLMClient;
    let fallback: LLMClient | undefined;

    if (mode === 'openai') {
      primary = new OpenAiLLMClient();
      fallback = new MockLLMClient();
    } else {
      primary = new MockLLMClient();
    }

    clientCache.set(cacheKey, new SafeLLMClient(primary, fallback));
  }

  return clientCache.get(cacheKey)!;
}

export function getModelId(modeOverride?: 'mock' | 'openai' | null): string {
  const mode = modeOverride !== undefined && modeOverride !== null ? modeOverride : config.llm.mode;
  if (mode === 'openai') {
    return `openai:${config.llm.openaiModel}`;
  }
  return 'mock';
}

