import type { RuntimePolicy } from './types.js';

export const DEFAULT_RUNTIME_POLICY: RuntimePolicy = {
  blockedCommands: ['rm', 'rmdir', 'format', 'del'],
  timeoutCeilingMs: 30 * 60 * 1000,
};
