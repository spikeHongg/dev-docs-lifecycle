# Prototype testbench

## What is currently verified

Run from the repository root:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tests/scripts/check_docs.py tests/fixtures/organized-project
python3 tests/scripts/check_docs.py tests/fixtures/small-project
```

The Python script has **no third-party dependencies**. It checks local Markdown links (excluding external URLs, anchors-only and templated links), bytes against SHA-256 entries in a fixture manifest, selected expected/forbidden paths, and outputs machine-readable JSON. It does **not** classify a document's lifecycle or perform migrations. Those judgments belong to Agent behavior tests.

## Pi mode-control tests

The optional Pi integration has a separate Node test suite. See [Pi project mode control](../docs/guides/pi-mode-control.md) for setup and test commands. It checks actual extension loading and simulated lifecycle/command handlers in temporary directories; it does not run model behavior evaluations or certify interactive TUI behavior.

## Behavioral cases (pending real Agent execution)

See [`cases/behavioral.md`](cases/behavioral.md) for the twelve scenarios and scoring rubric. Fixtures include a representative organized project. The supplied STE100 archive was used as source material for requirements but is **not** redistributed as a fully reproducible migrated before/after pair, because the uploaded archive lacks the claimed post-migration `docs/README.md` and `docs/archive/`.

Run each behavioral case in a disposable copy, with and without the Skill, record the model, host, inputs, full diffs, follow-up approvals and failures. Never run in a developer's production repository as a test.

## Root placement checks

The fixture manifest may opt in to `enforce_docs_placement` to flag non-exempt root Markdown files. This is a **test oracle for the default policy**, not a general migration tool: it does not attempt semantic classification of every root Markdown file, and real projects may have explicit exceptions. A separate fixture verifies that disabling the opt-in does not force a layout.

## Limitations

The checker does not understand GitHub-flavored heading slug edge cases, code references inside prose, JSON import graphs, or external network links. It never executes scripts copied from documents. Behavioral and trigger accuracy is not established until real-host tests are run.
