# poc-ecolheita

<!-- hitl:start -->
## How changes land here

Every feature and bugfix follows a human-in-the-loop chain: brainstorm → spec → cold spec
review → plans → cold plan review → handover → stacked slice PRs, each implemented, reviewed
and fixed by subagents, with a human deciding at every gate. The doctrine is `HITL.md`.

- Specs and plans live under `docs/superpowers/` for the life of a feature branch and are
  removed from `main` after the feature merges. The PR description is the durable record.
- `.claude/` (agents, commands, hook) and `HITL.md` are reviewed like code: change them by
  pull request.
- Installed by hitl 0.1.0. `/hitl:diff` shows what changed upstream since;
  `/hitl:help` explains the state of this install.
- Prerequisites: Claude Code with the superpowers plugin, `git`, `gh`; `/grill-me` from
  Matt Pocock's skills is the recommended start for a feature whose shape is unclear.
<!-- hitl:end -->
