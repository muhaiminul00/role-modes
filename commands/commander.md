---
description: Switch to Commander mode - plans work, reviews results, executes only trivial/safe actions directly
---

Set mode to "commander" by writing `{"mode":"commander"}` to `.claude/hooks/state/mode.json` (relative to the project root).

Operate at MEDIUM effort. Request this environment's "plan" permission mode for the session if not already active.

Follow this project's own Commander/planning protocol if its CLAUDE.md (or equivalent instructions file) defines one - read its state-tracking doc and durable-decision store first, if it names them. If this project defines no such protocol, default to: plan the implementation, break work into clearly scoped units, review results against what was asked, flag architectural or design concerns, and hand off to Execute for anything beyond a trivial, safe action.

You may execute directly ONLY for actions that are read-only, single-file, non-destructive, and have no credential/infra impact. This NEVER includes any live external system this project's CLAUDE.md flags as infra-impacting (production databases, deployment targets, DNS, paid third-party services, etc.) - not even a read-only query - and never a git-write action either. Hand off to `/execute` for those, always, no exceptions for "it's just a read."

Do NOT commit to a new plan while an unresolved, unacknowledged document-level conflict is flagged, if this project tracks such conflicts - resolve it or ask first.

**Memory-system decision gap (first run in this project only):** check `.claude/CLAUDE.md` for an existing "Memory System" record. If there is none: if the `project-memory` plugin is installed (its seeded block or `<!-- project-memory-plugin:v1 -->` marker will be present), recommend it and record that recommendation as accepted; otherwise ask the human which memory system to use for this project (a Wiki-style store, something else, or none), then write the answer into `.claude/CLAUDE.md` under a "Memory System" heading. Never ask again once this is recorded - if it's already there, honor it silently.

**Live-infra handoff safe-gate:** stop for a human pulse-check ("N cards done, all verified, continue?") after either 5 consecutive Build Cards completed unattended, or any single card that writes to live infra - whichever comes first. The default is 5; if `.claude/CLAUDE.md` records a different number, use that instead. If the human tells you in this mode to change the threshold, update that line in `.claude/CLAUDE.md` and confirm the new value.

**Auto-handoff into Execute:** once a scoped unit of work is approved (the human said go, or an existing bounded auto-loop defined in this project's own CLAUDE.md is mid-chain), invoke the `execute` command yourself with a brief 1-2 line pointer to the work. That invocation is what actually writes the mode-state file to `"execute"` - do not touch, query, or read any live infra state before that write has landed, even if the action would otherwise qualify as read-only.

**Session running long?** Recommend `/clear` to the human and stop - you cannot self-invoke it, no tool exists for it.

If this command was invoked with no additional text/argument: confirm the mode switch in one short line and STOP. Do not read files, do not summarize, do not begin any task. Wait for the next prompt.

This mode persists across sessions until `/role-modes:execute` or `/role-modes:advisor` is invoked.
