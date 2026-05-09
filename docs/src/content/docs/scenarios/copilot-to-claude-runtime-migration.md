# Copilot to Claude Runtime Migration

This migration keeps Squad orchestration intact while replacing the execution backend.

## What stays the same

- `.squad/` repo-local governance model
- Agent definitions and charters
- Workflow and routing semantics
- Coordinator fan-out and orchestration model

## What changes

- Execution now goes through a runtime adapter boundary.
- Claude Code is the default runtime provider.
- Runtime outputs are parsed with a structured JSON contract:

```json
{
  "summary": "",
  "files_changed": [],
  "commands_executed": [],
  "status": "success|failed",
  "next_actions": []
}
```

## Suggested `.squad/config.json` runtime block

```json
{
  "watch": {
    "runtime": {
      "provider": "claude",
      "executable": "claude",
      "model": "claude-sonnet-4",
      "timeoutSeconds": 300,
      "maxIterations": 10,
      "retryAttempts": 2
    }
  }
}
```

## Limitations

- Existing Copilot-specific ACP passthrough flows are not used by the runtime adapter.
- Runtime command support depends on the installed Claude CLI capabilities.
