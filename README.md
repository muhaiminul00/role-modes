# role-modes

A portable three-mode operating system for Claude Code: **Advisor**
(low-effort Q&A), **Commander** (plan/review, executes only trivial/safe
actions directly), **Execute** (full build authority within an approved
scope). Mode persists per-project and survives session restarts. Commander
and Execute can hand off to each other; Advisor is a leaf state, entered
and left only by explicit human command.

## Why this exists

This came out of a real project where "just build it" kept turning into
either over-eager changes to live infrastructure with no plan first, or
endless planning with nothing ever actually built. The fix was splitting
those into distinct modes with an explicit handoff between them, so
planning and execution never happen accidentally in the same breath. It
worked well enough there that it seemed worth extracting into something
reusable, instead of hand-copying the same mode files into every new
project.

It's a small, opinionated workflow discipline, not a framework - no task
queue, no agent orchestration, no dashboard. If the three-mode split
doesn't match how you like to work, this probably isn't for you; if
"plan first, build only once approved, don't touch live systems while
planning" sounds familiar, it might save you the setup.

## Install

```
/plugin marketplace add https://github.com/muhaiminul00/role-modes
/plugin install role-modes@role-modes
```

No manual setup step after that, at either install scope. Installed for
one project: it activates Advisor by default the next time Claude Code
starts there - no first command needed to "turn it on." Installed at user
scope: the same happens automatically in whatever project you open next.

**Caveat, stated plainly:** "the next time Claude Code starts there" means
an actual session boundary - `startup`, `resume`, `compact`, `clear`, or a
forked session. Running `/plugin install` itself does not trigger it, even
mid-session - Claude Code has no hook that fires the instant a plugin is
enabled, only at the next session boundary. If you don't want to wait for
that (or you're testing the plugin right after installing it), run
`/role-modes:init` - it does the one-time setup (the `.claude/CLAUDE.md`
starter block; mode state is already live the moment any `/role-modes:*`
command runs) immediately, in the current session, with no restart.

## Setup

There's nothing to configure to get a working default. Optional, once
installed:

1. Run `/role-modes:init` if you want the `.claude/CLAUDE.md` starter block
   seeded right now instead of waiting for the next session boundary.
2. Open the seeded block in `.claude/CLAUDE.md` and fill in the three
   placeholders it leaves (your Build Card format, your state-tracking doc,
   your "what counts as live infra" list) - or leave them blank and
   Commander/Execute fall back to generic judgment calls instead.
3. If you also install [`project-memory`](https://github.com/muhaiminul00/project-memory),
   Commander notices and recommends it on its first run - nothing to wire up
   by hand.

## Usage example

A fresh project, right after install, in a live session:

```
> /role-modes:init
Created .claude/hooks/state/mode.json ({"mode": "advisor"}).
Seeded .claude/CLAUDE.md with the role-modes starter block.

> /role-modes:commander
Mode: /role-modes:commander (persisted).

> Plan out the login page redesign.
[Commander plans, scopes the work into Build Cards, asks if this project
has a memory system recorded yet - none found, recommends project-memory -
then hands off to /role-modes:execute once you approve the scope.]
```

`mode.json` after that exchange:

```json
{"mode": "execute"}
```

## What you get

- `/role-modes:advisor`, `/role-modes:commander`, `/role-modes:execute` -
  slash commands to switch modes. **Note:** Claude Code namespaces every
  plugin's slash commands with the plugin name, so these must be typed
  with the `role-modes:` prefix - a bare `/commander` will not resolve to
  this plugin. This is a platform constraint, not something the plugin can
  opt out of.
- `/role-modes:init` - manual, on-demand setup: seeds the `.claude/CLAUDE.md`
  starter block right now instead of waiting for the next session boundary.
  Safe to re-run; does nothing if the block is already there.
- A `build-cards` skill Commander can use to scope work for Execute, as a
  generic fallback for any project that hasn't defined its own Build
  Card / task-spec format.
- A `SessionStart` hook (plain Node.js - no OS-specific shell scripts)
  that:
  - reads/creates `.claude/hooks/state/mode.json` (schema: `{"mode": "..."}`
    only - no other fields are read back) in the *installing project*,
    defaulting to `advisor` on first run;
  - injects the current mode's instructions into context every session,
    including the memory-system check and the live-infra safe-gate
    threshold described below;
  - once, gated behind a cheap sentinel file (not a full read of your
    `CLAUDE.md` on every session), appends a short starter block to that
    project's `.claude/CLAUDE.md` (marked with
    `<!-- role-modes-plugin:v1 -->`) - not your root `CLAUDE.md`, so
    plugin/tool instructions stay separate from the project documentation
    you actually maintain. This is a one-time, unversioned seed: a future
    plugin update to the starter block's content won't retroactively reach
    projects already seeded.

## Memory system

Commander needs somewhere to read and write durable project truth across
sessions. On its first run in a project, if `.claude/CLAUDE.md` doesn't
already record a choice, Commander recommends the
[`project-memory`](https://github.com/muhaiminul00/project-memory) plugin
if it's installed, or asks which memory system to use otherwise (a
different Wiki-style store, something else, or none) - then records the
answer so it's never asked again. Independently useful, but the two
plugins are designed to pair.

## Live-infra handoff safe-gate

Commander → Execute → Commander can chain unattended once work is
approved, but it isn't unbounded: it stops for a human pulse-check
("N cards done, all verified, continue?") after either 5 consecutive
Build Cards completed unattended, or any single card that writes to live
infra - whichever comes first. 5 is just the default; tell Claude a
different number while in Commander mode and it updates the threshold
recorded in `.claude/CLAUDE.md`.

This sits on top of, not instead of, the hard stops below - those always
end the turn regardless of how many cards have run.

## What this plugin does NOT assume about your project

The mode instructions are written to degrade gracefully. If your project's
own `CLAUDE.md` doesn't define these, generic fallback behavior is used
instead of hard-failing:

- A named Build Card / task-spec format (falls back to the bundled
  `build-cards` skill).
- A state-tracking doc or durable-decision store (see "Memory system"
  above).
- A list of what counts as "live infra" (things Commander must hand off to
  Execute rather than touch directly).

Fill these in in your own `CLAUDE.md` — the seeded starter block leaves
placeholders for exactly this. If you don't fill them in, Commander/Execute
still work, just with more generic judgment calls instead of project-specific
rules.

## Recommended companion

Pair this with [`project-memory`](https://github.com/muhaiminul00/project-memory)
for the durable, self-scaffolding Wiki/state/log system that Commander and
Execute actually read and write during real work. Each plugin is
independently useful; together they cover both halves of "plan and build
without losing context between sessions."

## Design notes

- **State lives in the consuming project, not the plugin.** Plugin code runs
  from a shared cache directory across every project it's installed in, so
  `mode.json` is written under `${CLAUDE_PROJECT_DIR}/.claude/hooks/state/` -
  each project gets its own independent mode state.
- **Hard stops are built in; the loop-length cap has one changeable knob.**
  Commander → Execute and Execute → Commander handoffs are real mode-state
  writes (not just described intent), and both commands unconditionally
  stop for a human on a credential gate, an unresolved conflict, a
  "decision needed" flag, or anything that would change the system's
  design - those are not covered by the count-based safe-gate above and
  never wait for 5 cards to accumulate.
- **Commands, not just skills.** The mode switches ship as `commands/*.md`
  (slash commands) rather than skills, matching how the mode switch is
  meant to be triggered explicitly by a human, not auto-invoked by
  Claude's own judgment. `build-cards` is the one skill in this plugin,
  since scoping work is something Commander should reach for on its own
  judgment, not something a human explicitly triggers.
- **`/role-modes:init` duplicates content, on purpose, with a check.**
  `commands/init.md` embeds a literal copy of the `.claude/CLAUDE.md`
  starter block that `hooks/session-start.js` writes - a slash-command has
  no way to read the hook's own code (`${CLAUDE_PLUGIN_ROOT}` is
  hooks/MCP/LSP/monitor-only). Rather than trust a comment alone to catch
  the two drifting apart, `scripts/check-init-sync.js` actually runs the
  hook against a scratch project and byte-diffs its output against the
  command file - run it after editing the block's wording, before
  committing.

## License

MIT
