import { describe, it, expect } from 'vitest';
import {
  parseStructuredResult,
  formatStructuredResultFallback,
} from '../../packages/squad-cli/src/runtime/structured-result.js';

describe('CLI runtime structured result parser', () => {
  it('parses valid structured JSON payloads', () => {
    const raw = JSON.stringify({
      summary: 'Task finished',
      files_changed: ['a.ts'],
      commands_executed: ['npm test'],
      status: 'success',
      next_actions: ['open PR'],
    });
    const parsed = parseStructuredResult(raw);
    expect(parsed.status).toBe('success');
    expect(parsed.files_changed).toEqual(['a.ts']);
  });

  it('recovers structured payload from noisy output', () => {
    const raw = [
      'Some preamble text',
      '{"summary":"Done","files_changed":[],"commands_executed":[],"status":"success","next_actions":[]}',
    ].join('\n');
    const parsed = parseStructuredResult(raw);
    expect(parsed.status).toBe('success');
    expect(parsed.summary).toBe('Done');
  });

  it('falls back to failed result when payload is invalid', () => {
    const parsed = parseStructuredResult('not-json');
    expect(parsed.status).toBe('failed');
    expect(parsed.error).toBeTruthy();
  });

  it('formats fallback result from runtime errors', () => {
    const parsed = formatStructuredResultFallback('', 'runtime failed');
    expect(parsed.status).toBe('failed');
    expect(parsed.error).toBe('runtime failed');
  });
});
