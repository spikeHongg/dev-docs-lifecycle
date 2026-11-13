#!/usr/bin/env python3
"""Read-only deterministic postflight checks for project-doc fixtures.

Run: python3 tests/scripts/check_docs.py path/to/project [--manifest path]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

LINK = re.compile(r"(?<!!)\[[^\]]+\]\((<[^>]+>|[^)]+)\)")
IMAGE = re.compile(r"!\[[^\]]*\]\((<[^>]+>|[^)]+)\)")
REF_DEF = re.compile(r"^\s*\[[^\]]+\]:\s*(\S+)", re.MULTILINE)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ignored(path: Path) -> bool:
    return any(p in {".git", "node_modules", ".venv", "__pycache__", ".DS_Store"} for p in path.parts)


def _check_link(root: Path, source: Path, raw: str) -> dict | None:
    raw = raw.strip()
    if raw.startswith("<") and ">" in raw:
        raw = raw[1: raw.index(">")]
    else:
        raw = raw.split(" ", 1)[0]
    if not raw or raw.startswith(("#", "{", "$")):
        return None
    uri = urlsplit(raw)
    if uri.scheme or uri.netloc or raw.startswith("//"):
        return None
    try:
        rel = unquote(uri.path)
    except ValueError:
        rel = uri.path
    if not rel:
        return None
    target = (source.parent / rel).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError:
        return {"kind": "outside-root", "source": source.relative_to(root).as_posix(), "target": raw}
    if not target.exists():
        return {"kind": "broken-link", "source": source.relative_to(root).as_posix(), "target": raw}
    return None


ROOT_METADATA_MD = {
    "README.md", "AGENTS.md", "CLAUDE.md", "CHANGELOG.md", "CONTRIBUTING.md",
    "SECURITY.md", "CODE_OF_CONDUCT.md", "LICENSE.md",
}


def check(root: Path, manifest: Path | None = None) -> dict:
    root = root.resolve()
    issues: list[dict] = []
    markdown = sorted(p for p in root.rglob("*.md") if not ignored(p.relative_to(root)))
    checked = 0
    for doc in markdown:
        content = doc.read_text(encoding="utf-8")
        urls = [m.group(1) for pattern in (LINK, IMAGE) for m in pattern.finditer(content)]
        urls += [m.group(1) for m in REF_DEF.finditer(content)]
        for url in urls:
            checked += 1
            issue = _check_link(root, doc, url)
            if issue:
                issues.append(issue)
    if manifest and manifest.exists():
        data = json.loads(manifest.read_text(encoding="utf-8"))
        # Optional fixture oracle for the project's default placement policy.
        # It is deliberately not applied to all repositories automatically.
        if data.get("enforce_docs_placement", False):
            allowed = ROOT_METADATA_MD | set(data.get("allowed_root_markdown", []))
            for doc in markdown:
                relative = doc.relative_to(root)
                if len(relative.parts) == 1 and relative.name not in allowed:
                    issues.append({"kind": "root-development-document", "target": relative.as_posix()})
        for rel, digest in data.get("sha256", {}).items():
            path = root / rel
            if not path.is_file():
                issues.append({"kind": "missing-hash-file", "target": rel})
            elif sha256(path) != digest:
                issues.append({"kind": "hash-mismatch", "target": rel})
        for rel in data.get("expected_paths", []):
            if not (root / rel).exists():
                issues.append({"kind": "missing-expected-path", "target": rel})
        for rel in data.get("forbidden_paths", []):
            if (root / rel).exists():
                issues.append({"kind": "forbidden-path-exists", "target": rel})
    return {"ok": not issues, "markdown_files": len(markdown), "links_checked": checked, "issues": issues}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    if not args.root.is_dir():
        parser.error("root must be an existing directory")
    manifest = args.manifest or (args.root / "test-manifest.json")
    result = check(args.root, manifest)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
