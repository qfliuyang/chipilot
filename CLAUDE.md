# CLAUDE.md - Chipilot Project Guidelines

## Anti-Mock & Anti-Cheating Principles (CRITICAL)

**These principles are non-negotiable for maintaining test integrity:**

### LLM Call Integrity
- **Real LLM Calls Only**: All agent LLM calls MUST be real - no rule-based fallbacks, hardcoded responses, or mock data allowed.
- **Token Usage Recording**: Token usage MUST be recorded via AgentRecorder for every LLM call/response.
- **Response Timing**: LLM calls take time; suspiciously fast responses (<50ms) are flagged as cheating.

### Communication Integrity
- **MessageBus Enforcement**: All inter-agent communication MUST go through MessageBus - direct method calls between agents are prohibited.
- **Message Authenticity**: AgentRecorder logs provide tamper-evident audit trail.
- **No Bypassing**: Agents must not hold references to other agents' internal methods.

### Test Framework Philosophy
- **Tests Expose Problems**: Tests MUST expose problems, not expect success. Tests that hide failures are forbidden.
- **Unified Test Framework**: No scattered test scripts. All tests MUST be in the unified framework under `tests/` directory.
- **Anti-Cheat Validation**: Use MockDetectionEngine to validate agent behavior.

## Anti-Cheat Violation Categories

| Category | Severity | Description |
|----------|----------|-------------|
| ORPHANED_LLM_RESPONSE | high | LLM response has no matching call |
| SUSPICIOUSLY_FAST_RESPONSE | high | Response too fast for real LLM call (<50ms) |
| MISSING_TOKEN_USAGE | medium | No token usage recorded |
| ZERO_TOKEN_USAGE | medium | Token usage recorded as zero |
| NO_MESSAGE_COORDINATION | medium | Agents active but no MessageBus usage |
| IDENTICAL_RESPONSES | high | Multiple identical LLM responses (template/mocking) |
| LOW_ENTROPY_RESPONSES | medium | Responses with unusually low entropy |

## MockDetectionEngine Usage

```typescript
import { MockDetectionEngine } from "./src/testing/MockDetectionEngine";

const detector = new MockDetectionEngine();
const result = await detector.analyzeDirectory("./tests/output/test-run-123");

if (!result.passed) {
  console.error("Cheating detected:", result.violations);
}
```

The engine validates:
- LLM call/response pairing (handles same-timestamp edge cases)
- Response timing (uses `duration` field when timestamps identical)
- Token usage presence and non-zero values
- Response entropy analysis

## When Running Tests

**Remember**: The goal is to find problems, not to pass tests. A test that fails is successful if it exposes a real issue.

1. Analyze test output for real agent behavior
2. Verify LLM calls are genuine via telemetry
3. Check for token usage in NDJSON recordings
4. Review response timing for authenticity
5. Fix actual bugs, don't hide them

## Project Structure

- `src/agents/` - Multi-agent system implementation
- `src/testing/` - Test framework and MockDetectionEngine
- `tests/` - Unified test framework (all tests belong here)
- `docs/` - Architecture and design documentation

## gstack

For all web browsing, use the `/browse` skill from gstack. **Never use `mcp__claude-in-chrome__*` tools.**

### Available gstack Skills

- `/office-hours` - Team communication and standups
- `/plan-ceo-review` - CEO-level strategic review planning
- `/plan-eng-review` - Engineering review planning
- `/plan-design-review` - Design review planning
- `/design-consultation` - Design consultation workflow
- `/design-shotgun` - Rapid design exploration
- `/design-html` - HTML design implementation
- `/review` - Comprehensive code review
- `/ship` - Ship/launch workflow
- `/land-and-deploy` - Deploy and land changes
- `/canary` - Canary deployment
- `/benchmark` - Performance benchmarking
- `/browse` - Web browsing (use this instead of Chrome MCP)
- `/connect-chrome` - Connect to Chrome browser
- `/qa` - Quality assurance workflow
- `/qa-only` - QA without additional context
- `/design-review` - Design review workflow
- `/setup-browser-cookies` - Browser cookie setup
- `/setup-deploy` - Deployment setup
- `/retro` - Retrospective facilitation
- `/investigate` - Deep investigation
- `/document-release` - Release documentation
- `/codex` - Codex integration
- `/cso` - Chief of Staff workflow
- `/autoplan` - Automated planning
- `/careful` - Careful/safe execution mode
- `/freeze` - Freeze/pause operations
- `/guard` - Guard/protect operations
- `/unfreeze` - Unfreeze/resume operations
- `/gstack-upgrade` - Upgrade gstack
- `/learn` - Manage project learnings

### Troubleshooting

If gstack skills aren't working (e.g., `/browse` command not found), run:

```bash
cd .claude/skills/gstack && ./setup
```

This will build the binaries and register all skills.
