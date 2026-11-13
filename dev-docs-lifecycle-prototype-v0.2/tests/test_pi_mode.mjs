import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const require = createRequire(import.meta.url);
const packageRoot = process.env.PI_EXTENSION_TEST_PACKAGE_ROOT
  || resolve(dirname(require.resolve("@earendil-works/pi-coding-agent")), "..");
const { loadExtensions } = await import(pathToFileURL(join(packageRoot, "dist/core/extensions/loader.js")));
const { loadSkillsFromDir } = await import(pathToFileURL(join(packageRoot, "dist/core/skills.js")));
const { normalizeBuildSystemPromptOptions, buildSystemPromptSections } = await import(
  pathToFileURL(join(packageRoot, "dist/core/system-prompt.js"))
);
const { CONFIG_DIR_NAME } = await import(pathToFileURL(join(packageRoot, "dist/config.js")));
const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionPath = join(project, "integrations/pi/dev-docs-lifecycle.ts");
const { skills, diagnostics } = loadSkillsFromDir({ dir: join(project, "skills/dev-docs-lifecycle"), source: "test" });
assert.equal(diagnostics.length, 0);
assert.equal(skills.length, 1);

async function harness(t, cwd) {
  const root = cwd || mkdtempSync(join(tmpdir(), "dev-docs-mode-test-"));
  if (!cwd) t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = await loadExtensions([extensionPath], root);
  assert.deepEqual(result.errors, []);
  assert.equal(result.extensions.length, 1);
  const extension = result.extensions[0];
  const notices = [];
  const statuses = [];
  const ctx = {
    cwd: root,
    hasUI: true,
    isProjectTrusted: () => true,
    isIdle: () => true,
    ui: {
      notify: (message, level) => notices.push({ message, level }),
      setStatus: (key, value) => statuses.push({ key, value }),
    },
  };
  const config = join(root, CONFIG_DIR_NAME, "dev-docs-lifecycle.json");
  const emit = async (name, event) => {
    for (const handler of extension.handlers.get(name) || []) await handler(event, ctx);
  };
  const command = extension.commands.get("dev-docs");
  assert.ok(command);
  const start = async (options) => {
    const systemPromptOptions = options || normalizeBuildSystemPromptOptions({
      cwd: root, skills, sections: { unrelated: "preserve this section" },
    });
    await emit("before_agent_start", { messageType: "user", prompt: "Hello", systemPromptOptions });
    return systemPromptOptions;
  };
  return { root, config, ctx, notices, statuses, emit, command, start };
}

test("default ON loads the registered Skill without writing configuration", async (t) => {
  const h = await harness(t);
  await h.emit("session_start", { reason: "startup" });
  const options = await h.start();
  const section = options.sections.dev_docs_lifecycle_mode;
  assert.match(section, /automatic mode is ON/);
  assert.match(section, /Default development-document location is `docs\/`/);
  assert.ok(section.includes(skills[0].filePath));
  assert.equal(options.sections.unrelated, "preserve this section");
  assert.match(buildSystemPromptSections(options).dev_docs_lifecycle_mode, /automatic mode is ON/);
  assert.equal(existsSync(h.config), false);
  assert.equal(h.statuses.at(-1).value, "docs:on");
});

test("OFF replaces ON instructions and survives a fresh extension instance", async (t) => {
  const h = await harness(t);
  const options = await h.start();
  await h.command.handler("off", h.ctx);
  assert.equal(JSON.parse(readFileSync(h.config)).mode, "off");
  await h.start(options);
  assert.match(options.sections.dev_docs_lifecycle_mode, /automatic mode is OFF/);
  assert.doesNotMatch(options.sections.dev_docs_lifecycle_mode, /# Development document lifecycle/);
  const fresh = await harness(t, h.root);
  await fresh.emit("session_start", { reason: "reload" });
  assert.equal(fresh.statuses.at(-1).value, "docs:off");
  assert.match((await fresh.start()).sections.dev_docs_lifecycle_mode, /automatic mode is OFF/);
  await fresh.command.handler("on", fresh.ctx);
  assert.match((await fresh.start()).sections.dev_docs_lifecycle_mode, /automatic mode is ON/);
});

test("status and invalid arguments do not create configuration", async (t) => {
  const h = await harness(t);
  await h.command.handler("status", h.ctx);
  assert.match(h.notices.at(-1).message, /dev-docs-lifecycle: on/);
  await h.command.handler("", h.ctx);
  await h.command.handler("maybe", h.ctx);
  assert.equal(h.notices.at(-1).level, "warning");
  assert.equal(existsSync(h.config), false);
  assert.deepEqual(h.command.getArgumentCompletions("of"), [{ value: "off", label: "off" }]);
});

test("mode writes preserve other configuration fields and unrelated files", async (t) => {
  const h = await harness(t);
  mkdirSync(dirname(h.config), { recursive: true });
  writeFileSync(h.config, JSON.stringify({ mode: "off", note: "keep" }));
  const unrelated = join(h.root, "README.md");
  writeFileSync(unrelated, "unchanged\n");
  await h.command.handler("on", h.ctx);
  assert.deepEqual(JSON.parse(readFileSync(h.config)), { mode: "on", note: "keep" });
  assert.equal(readFileSync(unrelated, "utf8"), "unchanged\n");
});

test("malformed or invalid modes fail visibly without overwriting configuration", async (t) => {
  const h = await harness(t);
  mkdirSync(dirname(h.config), { recursive: true });
  for (const text of ["{broken", '{"mode":"maybe"}', "null"]) {
    writeFileSync(h.config, text);
    const options = await h.start();
    assert.match(options.sections.dev_docs_lifecycle_mode, /Automatic loading failed/);
    assert.doesNotMatch(options.sections.dev_docs_lifecycle_mode, /# Development document lifecycle/);
    assert.equal(h.statuses.at(-1).value, "docs:error");
    await h.command.handler("on", h.ctx);
    assert.equal(readFileSync(h.config, "utf8"), text);
  }
});

test("unregistered or missing Skill never reports successful loading", async (t) => {
  const h = await harness(t);
  for (const entries of [[], [{ ...skills[0], filePath: join(h.root, "missing.md") }]]) {
    const options = normalizeBuildSystemPromptOptions({ cwd: h.root, skills: entries });
    await h.start(options);
    assert.match(options.sections.dev_docs_lifecycle_mode, /Automatic loading failed/);
    assert.equal(h.statuses.at(-1).value, "docs:error");
  }
});

test("busy responses reject mode changes without writing", async (t) => {
  const h = await harness(t);
  h.ctx.isIdle = () => false;
  await h.command.handler("off", h.ctx);
  assert.equal(h.notices.at(-1).level, "warning");
  assert.equal(existsSync(h.config), false);
});

test("untrusted project does not load rules or save mode", async (t) => {
  const h = await harness(t);
  h.ctx.isProjectTrusted = () => false;
  const options = await h.start();
  assert.match(options.sections.dev_docs_lifecycle_mode, /Automatic loading failed/);
  await h.command.handler("on", h.ctx);
  assert.equal(existsSync(h.config), false);
});
