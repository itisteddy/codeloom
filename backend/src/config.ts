export type Environment = 'development' | 'staging' | 'production' | 'test';

const NODE_ENV = (process.env.NODE_ENV as Environment) || 'development';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const llmConfig = {
  mode: (process.env.LLM_MODE || 'mock') as 'mock' | 'openai' | 'anthropic',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
};

// Validate LLM config - fail fast if mode requires API key but key is missing
if (llmConfig.mode === 'openai' && !llmConfig.openaiApiKey) {
  throw new Error('LLM_MODE=openai requires OPENAI_API_KEY to be set');
}
if (llmConfig.mode === 'anthropic' && !llmConfig.anthropicApiKey) {
  throw new Error('LLM_MODE=anthropic requires ANTHROPIC_API_KEY to be set');
}

export const plans = {
  plan_a: {
    key: 'plan_a',
    name: 'Core',
    maxProviders: 3,
    maxEncountersPerMonth: 200,
    trainingEnabled: false,
    analyticsEnabled: true,
    exportsEnabled: true,
  },
  plan_b: {
    key: 'plan_b',
    name: 'Plus',
    maxProviders: 10,
    maxEncountersPerMonth: 1000,
    trainingEnabled: true,
    analyticsEnabled: true,
    exportsEnabled: true,
  },
  plan_c: {
    key: 'plan_c',
    name: 'Education',
    maxProviders: 3,
    maxEncountersPerMonth: 100,
    trainingEnabled: true,
    analyticsEnabled: false,
    exportsEnabled: false,
  },
} as const;

export type PlanKey = keyof typeof plans;

export const config = {
  env: NODE_ENV,
  port: Number(process.env.PORT || 4000),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  logLevel: process.env.LOG_LEVEL || 'info',
  apiBasePath: process.env.API_BASE_PATH || '/api',
  llm: llmConfig,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

