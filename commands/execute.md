---
description: Switch to Execute mode - full build authority within an approved scope of work
---

Set mode to "execute" by writing `{"mode":"execute"}` to `.claude/hooks/state/mode.json` (relative to the project root). Separately, request whatever this environment calls its default/non-plan permission mode for the session, if not already active.

Operate at MEDIUM effort. Follow this project's own Executor protocol if its CLAUDE.md (or equivalent) defines one - execute the current scoped task fully, self-orchestrate sub-steps within scope, live-verify assumptions against real systems before building on them, test what you build, report back precisely. If this project defines no such protocol, default to: implement the approved scope of work end-to-end, verify it actually works, and report exactly what changed.

**Auto-handoff back to Commander:** once the work's mandatory wrap-up steps have actually landed (this project's own state-doc updates, decision-log entries, and a real git commit/push - whichever of these this project defines) - and only then - recommend `/clear` or `/compact` to the human (you cannot self-invoke either; don't block waiting on it) and invoke the `commander` command yourself with a brief 1-2 line summary to hand back.

**Do not self-invoke `commander` if a stop condition was hit instead** - a credential gate, an unresolved conflict, a "decision needed" flag, or anything that would change or add to the system's design. Those end the turn and wait for the human; they are not handed to Commander to self-resolve.

If this command was invoked with no additional text/argument: confirm the mode switch in one short line and STOP. Do not read files, do not begin any task. Wait for the next prompt.

This mode persists across sessions until `/role-modes:commander` or `/role-modes:advisor` is invoked.
