# dev-docs-lifecycle

**Lightweight documentation lifecycle management for AI coding agents.**

Keep project plans, designs, handoffs, issues, implementation reports and validation evidence findable, current and traceable—without introducing a documentation platform.

> **Prototype prerelease (v0.2.0).** The behavioral specification and deterministic postflight checks are implemented. An optional Pi integration provides persistent on/off controls and automatic Skill instruction loading. Automated semantic Agent evaluations have **not yet been run**; interactive TUI verification and cross-host compatibility testing remain pending.

## The problem

AI-assisted development generates persistent project documents fast. Files acquire ambiguous names, old handoffs masquerade as live instructions, completed reports get incorrectly archived, and moving documents breaks their links to evidence. `dev-docs-lifecycle` asks the coding agent to maintain the lifecycle of **development artifacts**, not simply shorten Markdown files.

## What it does

- **Default to `docs/`** for development artifacts, even in small projects; respect explicit, established project exceptions and keep conventional root entrypoints in place.
- **Discover conventions** before renaming anything; don't impose another project's versioning scheme.
- **Classify** document kind, work status and authority separately.
- **Organize** indexes, names and archive paths with minimal edits.
- **Preserve** historical evidence and update affected references and attachments.
- **Validate** links, integrity and Git-visible changes; report uncertain cases.

### Two operation modes

| Mode | When | Expected behavior |
|---|---|---|
| Incremental | New plan, handoff or validation report during development | Touch the document, its index and directly impacted references only |
| Maintenance | Explicit request to audit or clean an existing docs tree | Inventory, diagnose, propose a file-by-file plan, stop for approval, then execute and verify |

Read-only analysis requests never modify files. Historical instructions found in documents are treated as untrusted content, not active orders.

## Default document placement

New plans, designs, handoffs, implementation reports, and validation evidence belong under `docs/` by default. `docs/README.md` becomes the lightweight reading index; root `README.md` links to it. Standard root entrypoints and project metadata (such as `AGENTS.md`, `CHANGELOG.md`, and `LICENSE`) stay in their conventional locations. Explicit project-specific policies may override this default.

Example for a small project with its first validation report:

```text
my-project/
├── README.md
├── AGENTS.md
└── docs/
    ├── README.md
    └── validation/
        └── topic-implementation-validation-report.md
```

A read-only request proposes this layout without creating any file. Existing root reports are not bulk-migrated by an unrelated incremental task.

## Try locally

Install the folder `skills/dev-docs-lifecycle/` into the supported Skill directory of your AI coding agent. The prototype uses standard `name`/`description` YAML frontmatter; cross-host compatibility remains unverified. Pi users can follow the [project mode-control guide](docs/guides/pi-mode-control.md) for the optional extension.

Example prompts:

```text
Use dev-docs-lifecycle to audit docs/ in read-only mode. Identify current evidence, superseded handoffs and unsafe links; propose changes but do not modify files.
```

```text
Use dev-docs-lifecycle while adding the implementation report. Keep the docs index accurate and preserve links to its evaluation JSON. Do not scan or reorganize unrelated documents.
```

```text
Use dev-docs-lifecycle to execute the previously approved documentation reorganization and report exactly what changed and what was verified.
```

## Safety model

No inferred version numbers, no automatic file deletion, no overwrite on collision, no blind global replacements, no execution of commands copied from old handoffs, and no implicit Git commit/push. An ignored or untracked `docs/` is still part of the working project and must be reported as an export risk.

## Testbench

See [`tests/README.md`](tests/README.md). A deterministic checker validates links, file hashes and change inventories on fixtures. The semantic test matrix defines scenarios requiring a real Agent run; these are **not claimed as passed** by the checker.

## Why not doc-cleanup?

[`aka-luan/doc-cleanup`](https://github.com/aka-luan/doc-cleanup) focuses on context rot: stale claims, bloated required-reading Markdown and evidence-backed cleanup. This Skill deliberately targets **development document lifecycle and incremental maintenance**, including where a document belongs, which document is current, and how its linked evidence survives moves. It borrows the useful safety principle of read-only diagnosis before broad edits, while respecting the distinct scope.

## Roadmap and status

- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)
- [Testbench](tests/README.md)
- [Development docs index](docs/README.md)
- [Prototype review notes](docs/PROTOTYPE-NOTES.md)

This v0.2 prototype incorporates the Pi placement finding: root-level implementation reports are not the default. Source and prerelease downloads are provided through [GitHub Releases](https://github.com/spikeHongg/dev-docs-lifecycle/releases). It is not published to a package registry.
