import type { ChildProcess } from 'node:child_process';

export type RuntimeProvider = 'claude';

export type RuntimeStatus = 'success' | 'failed';

export interface RuntimeStructuredResult {
  summary: string;
  files_changed: string[];
  commands_executed: string[];
  status: RuntimeStatus;
  next_actions: string[];
  error?: string;
}

export interface RuntimeExecutionRequest {
  prompt: string;
  cwd: string;
  timeoutMs?: number;
  maxBuffer?: number;
  sessionId?: string;
}

export interface RuntimeExecutionOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  result: RuntimeStructuredResult;
  error?: string;
}

export interface RuntimeSession {
  id: string;
  cwd: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeStreamHandlers {
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

export interface RuntimePolicy {
  allowedCommands?: string[];
  blockedCommands?: string[];
  writablePaths?: string[];
  timeoutCeilingMs?: number;
  maxIterations?: number;
  enforceSandbox?: boolean;
  branchIsolation?: boolean;
}

export interface RuntimeImplementation {
  provider: RuntimeProvider;
  checkAvailable(): Promise<{ ok: boolean; reason?: string }>;
  createSession(cwd: string, metadata?: Record<string, unknown>): Promise<RuntimeSession>;
  executeTask(request: RuntimeExecutionRequest, stream?: RuntimeStreamHandlers): Promise<RuntimeExecutionOutput>;
  sendMessage(sessionId: string, message: string, stream?: RuntimeStreamHandlers): Promise<RuntimeExecutionOutput>;
  applyPatch(sessionId: string, patch: string, stream?: RuntimeStreamHandlers): Promise<RuntimeExecutionOutput>;
  streamOutput(child: ChildProcess, stream?: RuntimeStreamHandlers): void;
  cancel(sessionId: string): Promise<void>;
  parseResult(raw: string): RuntimeStructuredResult;
}

export interface RuntimeConfig {
  provider: RuntimeProvider;
  executable?: string;
  args?: string[];
  model?: string;
  timeoutSeconds?: number;
  maxIterations?: number;
  contextLimit?: number;
  retryAttempts?: number;
  policy?: RuntimePolicy;
}
