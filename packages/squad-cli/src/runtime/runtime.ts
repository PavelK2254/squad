import { ClaudeRuntime } from './claude-runtime.js';
import type { RuntimeConfig, RuntimeImplementation } from './types.js';

export function createRuntime(config?: Partial<RuntimeConfig>): RuntimeImplementation {
  const merged: RuntimeConfig = {
    provider: 'claude',
    timeoutSeconds: 300,
    maxIterations: 10,
    retryAttempts: 1,
    ...config,
  };

  if (merged.provider === 'claude') {
    return new ClaudeRuntime(merged);
  }

  // Defensive guard for future providers.
  throw new Error(`Unsupported runtime provider: ${String((merged as { provider?: unknown }).provider)}`);
}
