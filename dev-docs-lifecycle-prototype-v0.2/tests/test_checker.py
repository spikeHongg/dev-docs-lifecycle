import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("checker", ROOT / "tests/scripts/check_docs.py")
checker = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)
FIXTURE = ROOT / "tests/fixtures/organized-project"


class CheckerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / "project"
        shutil.copytree(FIXTURE, self.root)

    def tearDown(self):
        self.tmp.cleanup()

    def check(self):
        return checker.check(self.root, self.root / "test-manifest.json")

    def test_fixture_is_clean(self):
        report = self.check()
        self.assertTrue(report["ok"], report)
        self.assertGreaterEqual(report["links_checked"], 5)

    def test_detects_broken_link(self):
        source = self.root / "docs/README.md"
        source.write_text(source.read_text() + '\n[missing](no-such-file.md)\n')
        self.assertIn("broken-link", [x["kind"] for x in self.check()["issues"]])

    def test_detects_outside_repo(self):
        source = self.root / "docs/README.md"
        source.write_text(source.read_text() + '\n[outside](../../private.txt)\n')
        self.assertIn("outside-root", [x["kind"] for x in self.check()["issues"]])

    def test_detects_data_tamper(self):
        f = self.root / "docs/validation/v0.3-validation-eval-results.json"
        f.write_text('{"passed":false}\n')
        self.assertIn("hash-mismatch", [x["kind"] for x in self.check()["issues"]])

    def test_detects_missing_expected_path(self):
        (self.root / "docs/archive/v0.2-handoffs-old-task.md").unlink()
        self.assertIn("missing-expected-path", [x["kind"] for x in self.check()["issues"]])

    def test_detects_forbidden_path(self):
        f = self.root / "docs/handoffs/old-task.md"
        f.parent.mkdir(parents=True)
        f.write_text("historical")
        self.assertIn("forbidden-path-exists", [x["kind"] for x in self.check()["issues"]])

    def test_external_link_does_not_fail(self):
        source = self.root / "docs/README.md"
        source.write_text(source.read_text() + '\n[external](https://example.com/a)\n')
        self.assertTrue(self.check()["ok"])

    def test_root_development_doc_is_flagged_when_policy_enabled(self):
        manifest_path = self.root / "test-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["enforce_docs_placement"] = True
        manifest_path.write_text(json.dumps(manifest))
        (self.root / "FEATURE-IMPLEMENTATION-VALIDATION-REPORT.md").write_text("# Report\n")
        self.assertIn("root-development-document", [i["kind"] for i in self.check()["issues"]])

    def test_root_entrypoints_are_exempt(self):
        manifest_path = self.root / "test-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["enforce_docs_placement"] = True
        manifest_path.write_text(json.dumps(manifest))
        (self.root / "AGENTS.md").write_text("# Agent guidance\n")
        (self.root / "CHANGELOG.md").write_text("# History\n")
        self.assertTrue(self.check()["ok"], self.check())

    def test_explicit_policy_exception_disables_default_oracle(self):
        manifest_path = self.root / "test-manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["enforce_docs_placement"] = False
        manifest_path.write_text(json.dumps(manifest))
        (self.root / "FEATURE-IMPLEMENTATION-VALIDATION-REPORT.md").write_text("# Report\n")
        self.assertTrue(self.check()["ok"], self.check())

    def test_readonly_idempotency(self):
        before = {p.relative_to(self.root): checker.sha256(p) for p in self.root.rglob("*") if p.is_file()}
        self.check()
        self.check()
        after = {p.relative_to(self.root): checker.sha256(p) for p in self.root.rglob("*") if p.is_file()}
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
