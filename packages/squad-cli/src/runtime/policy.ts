import path from 'node:path';
import type { RuntimePolicy } from './types.js';

function normalizeName(command: string): string {
  return path.basename(command).toLowerCase();
}

export function enforceRuntimePolicy(
  command: string,
  cwd: string,
  timeoutMs: number | undefined,
  policy?: RuntimePolicy,
): void {
  if (!policy) return;
  const commandName = normalizeName(command);

  if (policy.blockedCommands?.some(c => normalizeName(c) === commandName)) {
    throw new Error(`Runtime policy blocked command: ${commandName}`);
  }

  if (policy.allowedCommands && policy.allowedCommands.length > 0) {
    const allowed = policy.allowedCommands.some(c => normalizeName(c) === commandName);
    if (!allowed) {
      throw new Error(`Runtime policy denied command not in allowlist: ${commandName}`);
    }
  }

  if (policy.writablePaths && policy.writablePaths.length > 0) {
    const isAllowedPath = policy.writablePaths.some(p => cwd.startsWith(path.resolve(p)));
    if (!isAllowedPath) {
      throw new Error(`Runtime policy denied cwd outside writable paths: ${cwd}`);
    }
  }

  if (policy.timeoutCeilingMs && timeoutMs && timeoutMs > policy.timeoutCeilingMs) {
    throw new Error(`Runtime timeout ${timeoutMs}ms exceeds policy ceiling ${policy.timeoutCeilingMs}ms`);
  }
}
