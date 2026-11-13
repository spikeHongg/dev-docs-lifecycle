# dev-docs-lifecycle

Development document lifecycle management for AI coding agents: keep plans, handoffs, implementation reports, and validation evidence findable, current, and traceable.

**v0.2.0 is a prototype prerelease.** It includes a portable Skill and an optional Pi integration with a persistent project-level on/off switch. Automated semantic Agent evaluations and cross-host compatibility testing remain pending.

## Current source

The active source lives in [`dev-docs-lifecycle-prototype-v0.2/`](dev-docs-lifecycle-prototype-v0.2/README.md). Its development records are indexed in [the development documentation index](dev-docs-lifecycle-prototype-v0.2/docs/README.md).

- [Skill instructions](dev-docs-lifecycle-prototype-v0.2/skills/dev-docs-lifecycle/SKILL.md)
- [Pi on/off setup and commands](dev-docs-lifecycle-prototype-v0.2/docs/guides/pi-mode-control.md)
- [Tests and limitations](dev-docs-lifecycle-prototype-v0.2/tests/README.md)
- [Changelog](dev-docs-lifecycle-prototype-v0.2/CHANGELOG.md)
- [Releases](https://github.com/spikeHongg/dev-docs-lifecycle/releases)

## Use the Skill

Copy `dev-docs-lifecycle-prototype-v0.2/skills/dev-docs-lifecycle/` into your agent's supported Skill directory. It supports incremental maintenance during development and broader maintenance audits, with read-only requests honored in either mode. New development artifacts default to `docs/` unless an explicit project policy establishes another layout.

For Pi launched from this repository root, the included `.pi/settings.json` registers both the Skill and the optional extension. After granting project trust and running `/reload`, use:

```text
/dev-docs status
/dev-docs on
/dev-docs off
```

The saved default is `on`. Enabling the Skill supplies its rules for relevant tasks; it does not initiate a scan or authorize file changes. Other hosts use the Skill without the Pi-specific commands.

## Validation scope

The release checks include 11 Python checker tests, 8 Pi extension-handler tests, and integrity checks for two documentation fixtures. These deterministic checks do not establish Agent lifecycle-classification accuracy, interactive TUI behavior, or production readiness. The implementation validation report named `sample-implementation-validation-report.md` is explicitly a test sample, not product evidence.
