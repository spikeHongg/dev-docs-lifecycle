# Pi project mode control

Status: Implemented with local extension-handler tests. Interactive command display and reload behavior still require verification in the user's Pi session.

The [Pi extension](../../integrations/pi/dev-docs-lifecycle.ts) provides a persistent project switch for the [Skill](../../skills/dev-docs-lifecycle/SKILL.md). The default is `on`.

## Commands

After registering the extension and running `/reload`:

| Command | Effect |
|---|---|
| `/dev-docs` or `/dev-docs status` | Show the current project setting without changing it |
| `/dev-docs on` | Save `on`; include the registered Skill's instructions before the next agent run |
| `/dev-docs off` | Save `off`; stop automatically including and applying the Skill's instructions |

The footer status is `docs:on`, `docs:off`, or `docs:error`. Mode changes take effect on the next prompt and survive reloads and new sessions in the same working directory. Wait until the current response finishes before switching mode.

When on, the full Skill instructions are supplied before each agent run through a dedicated system-prompt section. They apply only to tasks within the Skill's scope. Starting a conversation does not initiate an audit or modify documentation.

When off, that section contains a disabling instruction. Previously loaded conversation text remains in history; disabling is an instruction to stop automatic application, not a promise to erase model context. Explicitly requesting the Skill, including `/skill:dev-docs-lifecycle`, enables its use for that task without changing the saved mode.

## Project configuration

Register both the Skill and extension in the working directory's `.pi/settings.json`. Paths resolve relative to `.pi/`. For Pi launched from the prototype directory itself, merge these entries into existing arrays:

```json
{
  "skills": ["../skills/dev-docs-lifecycle"],
  "extensions": ["../integrations/pi/dev-docs-lifecycle.ts"]
}
```

When Pi runs from a parent workspace, include the prototype directory in both paths. The current workspace uses that parent-directory arrangement. Existing unrelated settings should be preserved.

Mode is stored separately in the working directory's `.pi/dev-docs-lifecycle.json`:

```json
{
  "mode": "on"
}
```

A missing mode file defaults to `on` without creating a file. The commands save mode explicitly and preserve other fields in valid configuration. Invalid configuration produces an error and is left unchanged. Missing Skill registration or unreadable Skill instructions disables automatic injection for that run and reports an error.

The extension uses the Skill registered by Pi rather than hardcoding a prototype version. Switching the registered Skill source changes which instructions are loaded. Project configuration requires Pi project trust. These settings do not apply globally or automatically follow arbitrary working-directory changes.

## Validation

The [extension tests](../../tests/test_pi_mode.mjs) use Pi's installed extension loader, Skill parser, and prompt-section builder. Event contexts are simulated, with all mode writes confined to temporary directories. They cover default-on injection, off/on switching, persistence across fresh extension instances, status queries, invalid arguments/configuration, preservation of unrelated data, missing Skill files, busy sessions, and project trust.

From the prototype directory, with Pi resolvable as a Node package:

```bash
node --test tests/test_pi_mode.mjs
```

For a globally installed Pi package, supply its package directory:

```bash
PI_EXTENSION_TEST_PACKAGE_ROOT=/path/to/node_modules/@earendil-works/pi-coding-agent node --test tests/test_pi_mode.mjs
```

These checks do not call a model and do not establish semantic compliance or compatibility across Pi versions. In an interactive session, reload once, inspect `/dev-docs status`, switch off and on, and confirm the footer and next-task behavior.
