import { execFile, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type {
  RuntimeConfig,
  RuntimeExecutionOutput,
  RuntimeExecutionRequest,
  RuntimeImplementation,
  RuntimeSession,
  RuntimeStreamHandlers,
} from './types.js';
import { parseStructuredResult, formatStructuredResultFallback } from './structured-result.js';
import { enforceRuntimePolicy } from './policy.js';
import { DEFAULT_RUNTIME_POLICY } from './policy-config.js';

const sessionProcesses = new Map<string, ChildProcess>();

export class ClaudeRuntime implements RuntimeImplementation {
  readonly provider = 'claude' as const;

  constructor(private readonly config: RuntimeConfig) {}

  async checkAvailable(): Promise<{ ok: boolean; reason?: string }> {
    const executable = this.config.executable || 'claude';
    return new Promise((resolve) => {
      execFile(executable, ['--version'], (err) => {
        if (err) resolve({ ok: false, reason: `Claude runtime not available: ${err.message}` });
        else resolve({ ok: true });
      });
    });
  }

  async createSession(cwd: string, metadata?: Record<string, unknown>): Promise<RuntimeSession> {
    return {
      id: randomUUID(),
      cwd,
      metadata,
    };
  }

  async executeTask(request: RuntimeExecutionRequest, stream?: RuntimeStreamHandlers): Promise<RuntimeExecutionOutput> {
    const executable = this.config.executable || 'claude';
    const timeoutMs = request.timeoutMs ?? (this.config.timeoutSeconds ? this.config.timeoutSeconds * 1000 : undefined);
    const args = [...(this.config.args ?? [])];
    if (this.config.model) {
      args.push('--model', this.config.model);
    }
    // The runtime prompt contract is always machine-readable JSON.
    args.push('-p', request.prompt);

    enforceRuntimePolicy(executable, request.cwd, timeoutMs, this.config.policy ?? DEFAULT_RUNTIME_POLICY);

    return new Promise((resolve) => {
      const child = execFile(
        executable,
        args,
        {
          cwd: request.cwd,
          timeout: timeoutMs,
          maxBuffer: request.maxBuffer ?? 50 * 1024 * 1024,
        },
        (err, stdout, stderr) => {
          const out = String(stdout ?? '');
          const errText = String(stderr ?? '');
          const exitCode = typeof child.exitCode === 'number' ? child.exitCode : null;
          if (err) {
            const message = (err as Error & { killed?: boolean }).killed ? 'Timed out' : err.message;
            resolve({
              success: false,
              stdout: out,
              stderr: errText,
              exitCode,
              error: message,
              result: formatStructuredResultFallback(out || errText, message),
            });
            return;
          }

          resolve({
            success: true,
            stdout: out,
            stderr: errText,
            exitCode,
            result: this.parseResult(out),
          });
        },
      );

      if (request.sessionId) {
        sessionProcesses.set(request.sessionId, child);
      }
      this.streamOutput(child, stream);
      child.on('exit', () => {
        if (request.sessionId) sessionProcesses.delete(request.sessionId);
      });
    });
  }

  async sendMessage(sessionId: string, message: string, stream?: RuntimeStreamHandlers): Promise<RuntimeExecutionOutput> {
    const session = await this.createSession(process.cwd(), { resumedFrom: sessionId });
    return this.executeTask({
      prompt: message,
      cwd: session.cwd,
      sessionId: session.id,
    }, stream);
  }

  async applyPatch(sessionId: string, patch: string, stream?: RuntimeStreamHandlers): Promise<RuntimeExecutionOutput> {
    const prompt = `Apply this patch and return structured JSON only:\n${patch}`;
    return this.sendMessage(sessionId, prompt, stream);
  }

  streamOutput(child: ChildProcess, stream?: RuntimeStreamHandlers): void {
    child.stdout?.on('data', (chunk: Buffer | string) => {
      stream?.onStdout?.(chunk.toString());
    });
    child.stderr?.on('data', (chunk: Buffer | string) => {
      stream?.onStderr?.(chunk.toString());
    });
  }

  async cancel(sessionId: string): Promise<void> {
    const child = sessionProcesses.get(sessionId);
    if (!child) return;
    child.kill();
    sessionProcesses.delete(sessionId);
  }

  parseResult(raw: string) {
    return parseStructuredResult(raw);
  }
}
