# Roadmap

Future milestone names below are planning targets, not release guarantees. v0.2.0 is a prototype prerelease; publication does not imply that the later quality gates have passed.

| Stage | Target | Exit criteria |
|---|---|---|
| Prototype | v0.2.0 prototype | Self-contained `SKILL.md`, corrected `docs/` default, isolated placement regression fixtures, deterministic integrity checker and transparent limitations |
| Behavioral evaluation | v0.2.x | Execute scenario tests against real agent host; track false archives, reference failures, unauthorized edits and no-op repeatability |
| Open-source readiness | v0.3.x | Review license choice, README, test evidence, documented install, community files, security/data handling, name collisions |
| Public project validation | post-prerelease | Generalized rules verified on two unlike projects, no project-specific absolute paths and no invented performance claims |
| Distribution | post-public | Validate selected hosts and a supported package installation path before documenting `npx skills add` as tested |
| Stable | v1.0.0 target | Reproducible behavioral evaluation, resolved severe edge cases, stable workflow contract |

The prototype includes an optional Pi adapter for project-level on/off control. No standalone CLI, MCP server, web UI, or config service is planned.
