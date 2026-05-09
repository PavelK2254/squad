import type { RuntimeStructuredResult } from './types.js';

const DEFAULT_RESULT: RuntimeStructuredResult = {
  summary: '',
  files_changed: [],
  commands_executed: [],
  status: 'failed',
  next_actions: [],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeResult(candidate: unknown): RuntimeStructuredResult | null {
  if (!isObject(candidate)) return null;
  const summary = typeof candidate['summary'] === 'string' ? candidate['summary'] : '';
  const filesChanged = Array.isArray(candidate['files_changed'])
    ? candidate['files_changed'].filter(v => typeof v === 'string') as string[]
    : [];
  const commandsExecuted = Array.isArray(candidate['commands_executed'])
    ? candidate['commands_executed'].filter(v => typeof v === 'string') as string[]
    : [];
  const nextActions = Array.isArray(candidate['next_actions'])
    ? candidate['next_actions'].filter(v => typeof v === 'string') as string[]
    : [];
  const status = candidate['status'] === 'success' ? 'success' : candidate['status'] === 'failed' ? 'failed' : null;
  if (!status) return null;
  const error = typeof candidate['error'] === 'string' ? candidate['error'] : undefined;
  return {
    summary,
    files_changed: filesChanged,
    commands_executed: commandsExecuted,
    status,
    next_actions: nextActions,
    error,
  };
}

export function parseStructuredResult(raw: string): RuntimeStructuredResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ...DEFAULT_RESULT, error: 'Runtime returned empty output' };
  }

  // First attempt: entire payload is JSON.
  try {
    const parsed = JSON.parse(trimmed);
    const normalized = normalizeResult(parsed);
    if (normalized) return normalized;
  } catch {
    // Fallback below.
  }

  // Fallback: recover the last JSON object from noisy output.
  const start = trimmed.lastIndexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const candidate = JSON.parse(trimmed.slice(start, end + 1));
      const normalized = normalizeResult(candidate);
      if (normalized) return normalized;
    } catch {
      // Fall through.
    }
  }

  return {
    ...DEFAULT_RESULT,
    summary: trimmed.split('\n').slice(-3).join(' ').slice(0, 500),
    error: 'Runtime output did not match structured response contract',
  };
}

export function formatStructuredResultFallback(raw: string, error: string): RuntimeStructuredResult {
  const compact = raw.trim();
  return {
    ...DEFAULT_RESULT,
    summary: compact ? compact.slice(0, 500) : error,
    error,
  };
}
