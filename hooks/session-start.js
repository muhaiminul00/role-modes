#!/usr/bin/env node
'use strict';

// role-modes plugin - SessionStart hook
// Reads/creates the per-project mode-state file and injects the current
// mode's instructions into context. Also seeds this project's CLAUDE.md
// with a short starter block, once, the first time the plugin ever runs
// in that project.
//
// Runs under plain Node.js so it behaves identically on Windows/macOS/Linux -
// no OS-specific shell scripts or dispatcher shims needed.

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateDir = path.join(projectDir, '.claude', 'hooks', 'state');
const stateFile = path.join(stateDir, 'mode.json');

// State schema is just { "mode": "advisor" | "commander" | "execute" }.
// (v1.0.0 also wrote `effort`/`permission_mode` fields here, but nothing
// ever read them back - this hook is the only reader, and a mode's effort
// level is a fixed property of the mode itself, not something to persist.
// Dropped both rather than carry inert state around.)
let mode = 'advisor';

try {
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  if (state.mode) mode = state.mode;
} catch (err) {
  // Missing, corrupt, or unreadable state file - fall back to the default
  // mode for this run, and try to (re)create the file with that default.
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify({ mode }, null, 2), 'utf8');
  } catch (writeErr) {
    // Best-effort; the session still gets a correct default mode this run
    // even if persisting it fails.
  }
}

const modeInstructions = {
  commander:
    'MODE: /commander (persisted). Effort: MEDIUM. Plan, break work into scoped units, review results, ' +
    'flag architectural concerns. Execute directly ONLY for read-only/single-file/non-destructive actions ' +
    'with no credential or live-infra impact and no git-write - hand off to /execute for anything else, ' +
    'including read-only queries against live infra. Follow this project\'s own Commander protocol if its ' +
    'CLAUDE.md names one.',
  execute:
    'MODE: /execute (persisted). Effort: MEDIUM. Full build authority within the current approved scope of ' +
    'work - self-orchestrate, live-verify assumptions against real systems before building on them, test ' +
    'what you build, report precisely. Follow this project\'s own Executor protocol if its CLAUDE.md names one.',
  advisor:
    'MODE: /advisor (persisted/default). Effort: LOW. Advisory Q&A only - no build actions, no plans ' +
    'committed to any file, no execution.'
};

const modeInstruction = modeInstructions[mode] || modeInstructions.advisor;

const context = [
  modeInstruction,
  '',
  "This project may define its own state-tracking doc, decision store, and infra list in its CLAUDE.md - " +
    'read those before starting work if they exist. None is assumed by default.'
].join('\n');

const output = {
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: context
  }
};

// Emit the hook's actual required output first; CLAUDE.md seeding below is
// a one-time convenience side effect and shouldn't sit ahead of it.
process.stdout.write(JSON.stringify(output));

seedClaudeMd(projectDir);

function seedClaudeMd(dir) {
  // Cheap sentinel-file stat gates this on every run after the first, so a
  // project's (potentially large) CLAUDE.md is never read just to test for
  // the marker - it's read/written at most once per project.
  // Note: this is a one-time, unversioned seed. If the starter block's
  // content changes in a later plugin version, projects seeded under an
  // earlier version won't be re-seeded or migrated automatically.
  const sentinelFile = path.join(stateDir, '.claude-md-seeded');
  if (fs.existsSync(sentinelFile)) return;

  const marker = '<!-- role-modes-plugin:v1 -->';
  const claudeMdPath = path.join(dir, 'CLAUDE.md');

  const block = [
    '',
    marker,
    '## Role Modes (role-modes plugin)',
    '',
    'This project has the `role-modes` plugin installed, providing three operating',
    'modes switched via slash command and persisted across sessions in',
    '`.claude/hooks/state/mode.json`:',
    '',
    '- `/advisor` - default. Low-effort Q&A only, no build actions.',
    '- `/commander` - plans work, may execute only trivial/safe/read-only single-file',
    '  actions directly, hands off anything else to `/execute`.',
    '- `/execute` - full build authority within an approved scope of work.',
    '',
    'Fill in the specifics that make this useful for THIS project:',
    "- Name this project's state-tracking doc / decision log, if any.",
    '- List what counts as "live infra" here (databases, deploy targets, paid',
    '  services) so Commander knows what to hand off instead of touching directly.',
    "- Name this project's own Build Card / task-spec format, if any.",
    '',
    'Recommended companion: pair this with a durable, promotable memory system (a',
    'Wiki-style durable-facts store, kept separate from a pure append-only session',
    'log) so Commander/Execute have somewhere to read and write project truth across',
    'sessions. (A standalone plugin for this is planned separately - not part of',
    'role-modes itself.)',
    marker,
    ''
  ].join('\n');

  try {
    const existing = fs.existsSync(claudeMdPath) ? fs.readFileSync(claudeMdPath, 'utf8') : '';
    if (!existing.includes(marker)) {
      const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n');
      fs.appendFileSync(claudeMdPath, (needsLeadingNewline ? '\n' : '') + block, 'utf8');
    }
    fs.writeFileSync(sentinelFile, '', 'utf8');
  } catch (err) {
    // Seeding is a convenience, not a requirement for the mode system to work.
  }
}
