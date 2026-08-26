# role-modes

A portable three-mode operating system for Claude Code: **Advisor** (low-effort
Q&A), **Commander** (plan/review, executes only trivial/safe actions directly),
**Execute** (full build authority within an approved scope). Mode persists
per-project and survives session restarts. Commander and Execute can hand off
to each other; Advisor is a leaf state, entered and left only by explicit
human command.

Extracted from an internal project's working three-mode setup so it can be
dropped into any other project as a real Claude Code plugin, instead of being
copy-pasted as static per-project files.

## Install

```
/plugin install role-modes@<your-marketplace-or-repo-source>
```

(Exact install command depends on how you've registered this repo as a
plugin source in your Claude Code setup.)

## What you get

- `/advisor`, `/commander`, `/execute` - slash commands, kept bare (not
  namespaced) so they match how you'd type them today.
- A `SessionStart` hook (plain Node.js - no OS-specific shell scripts) that:
  - reads/creates `.claude/hooks/state/mode.json` (schema: `{"mode": "..."}`
    only - no other fields are read back) in the *installing project*,
    defaulting to `advisor` on first run;
  - injects the current mode's instructions into context every session;
  - once, gated behind a cheap sentinel file (not a full read of your
    `CLAUDE.md` on every session), appends a short starter block to that
    project's `CLAUDE.md` (marked with `<!-- role-modes-plugin:v1 -->`)
    explaining the modes and prompting you to fill in project-specific
    detail - see below. This is a one-time, unversioned seed: a future
    plugin update to the starter block's content won't retroactively reach
    projects already seeded.

## What this plugin does NOT assume about your project

The mode instructions are written to degrade gracefully. If your project's
own `CLAUDE.md` doesn't define these, generic fallback behavior is used
instead of hard-failing:

- A named Build Card / task-spec format
- A state-tracking doc or durable-decision store (e.g. a Wiki)
- A list of what counts as "live infra" (things Commander must hand off to
  Execute rather than touch directly)

Fill these in in your own `CLAUDE.md` — the seeded starter block leaves
placeholders for exactly this. If you don't fill them in, Commander/Execute
still work, just with more generic judgment calls instead of project-specific
rules.

## What's deliberately NOT included

This plugin is scoped to the mode system only. It does not include:
Python-venv enforcement, credential/permission-denial fallbacks, or any
project-specific tooling hooks — those stay in the project that needs them,
not in a portable plugin.

A companion plugin for a Wiki-style durable-memory system (facts/decisions
store, separate from a pure append-only log) is planned separately and is
**not** part of this plugin.

## Design notes

- **State lives in the consuming project, not the plugin.** Plugin code runs
  from a shared cache directory across every project it's installed in, so
  `mode.json` is written under `${CLAUDE_PROJECT_DIR}/.claude/hooks/state/` -
  each project gets its own independent mode state.
- **Hard stops are built in; a numeric cap on the loop is not.** Commander →
  Execute and Execute → Commander handoffs are real mode-state writes (not
  just described intent), and both commands unconditionally stop for a human
  on a credential gate, an unresolved conflict, a "decision needed" flag, or
  anything that would change the system's design. That's the generic core's
  guarantee. A bound on *how many* handoffs can chain unattended (e.g. "stop
  after 3 cards," "stop after any live-infra write") is not built in here -
  add one in your own project's CLAUDE.md if you want it, the same way the
  source project this plugin was extracted from does.
- **Commands, not just skills.** These ship as `commands/*.md` (slash
  commands) rather than skills, matching how the mode switch is meant to be
  triggered explicitly by a human, not auto-invoked by Claude's own judgment.

## License

MIT
