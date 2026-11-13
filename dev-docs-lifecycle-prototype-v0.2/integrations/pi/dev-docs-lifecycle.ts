import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  CONFIG_DIR_NAME,
  stripFrontmatter,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

type Mode = "on" | "off";
const skillName = "dev-docs-lifecycle";
const sectionName = "dev_docs_lifecycle_mode";
const offGuidance =
  "dev-docs-lifecycle automatic mode is OFF. Do not automatically apply this Skill, including its previously loaded instructions. An explicit user request to use the Skill may enable it for that task only. Continue following the user's task and other applicable project instructions.";

function configPath(ctx: ExtensionContext): string {
  return join(ctx.cwd, CONFIG_DIR_NAME, `${skillName}.json`);
}

function readConfig(ctx: ExtensionContext): { mode: Mode; [key: string]: unknown } {
  if (!ctx.isProjectTrusted()) throw new Error("Project configuration is not trusted.");
  let text: string;
  try {
    text = readFileSync(configPath(ctx), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { mode: "on" };
    throw error;
  }
  const config = JSON.parse(text);
  if (!config || Array.isArray(config) || !["on", "off"].includes(config.mode)) {
    throw new Error(`${configPath(ctx)} must contain mode: "on" or "off".`);
  }
  return config;
}

function saveMode(ctx: ExtensionContext, mode: Mode): void {
  const config = { ...readConfig(ctx), mode };
  const destination = configPath(ctx);
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { flag: "wx" });
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export default function devDocsLifecycleMode(pi: ExtensionAPI) {
  let lastError: string | undefined;

  function status(ctx: ExtensionContext, value: string): void {
    if (ctx.hasUI) ctx.ui.setStatus(skillName, `docs:${value}`);
  }

  function reportError(ctx: ExtensionContext, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    status(ctx, "error");
    if (ctx.hasUI && message !== lastError) ctx.ui.notify(`${skillName}: ${message}`, "error");
    lastError = message;
  }

  pi.on("session_start", (_event, ctx) => {
    try {
      status(ctx, readConfig(ctx).mode);
      lastError = undefined;
    } catch (error) {
      reportError(ctx, error);
    }
  });

  pi.registerCommand("dev-docs", {
    description: "Set project documentation Skill mode: on | off | status (default: on)",
    getArgumentCompletions: (prefix) => {
      const matches = ["on", "off", "status"]
        .filter((value) => value.startsWith(prefix))
        .map((value) => ({ value, label: value }));
      return matches.length ? matches : null;
    },
    handler: async (args, ctx) => {
      const action = args.trim().toLowerCase() || "status";
      if (!["on", "off", "status"].includes(action)) {
        if (ctx.hasUI) ctx.ui.notify("Usage: /dev-docs on | off | status", "warning");
        return;
      }
      if (action !== "status" && !ctx.isIdle()) {
        if (ctx.hasUI) ctx.ui.notify("Wait for the current response to finish before changing mode.", "warning");
        return;
      }
      try {
        if (action !== "status") saveMode(ctx, action as Mode);
        const mode = readConfig(ctx).mode;
        status(ctx, mode);
        lastError = undefined;
        if (ctx.hasUI) {
          ctx.ui.notify(
            `${skillName}: ${mode}. Project setting: ${configPath(ctx)}. Applies to the next prompt and future sessions.`,
            "info",
          );
        }
      } catch (error) {
        reportError(ctx, error);
      }
    },
  });

  pi.on("before_agent_start", (event, ctx) => {
    const sections = event.systemPromptOptions.sections;
    // Replace only our section so stale ON instructions cannot remain in this slot.
    sections[sectionName] = offGuidance;
    try {
      const mode = readConfig(ctx).mode;
      if (mode === "on") {
        const skill = event.systemPromptOptions.skills.find((entry) => entry.name === skillName);
        if (!skill) throw new Error("Skill is not registered. Check project skills settings and reload.");
        const body = stripFrontmatter(readFileSync(skill.filePath, "utf8")).trim();
        if (!body) throw new Error(`Skill instructions are empty: ${skill.filePath}`);
        sections[sectionName] = [
          "dev-docs-lifecycle automatic mode is ON. The Skill instructions below are already loaded; apply them when the task is in scope. Enabling this mode alone does not authorize any scan or file change. An explicit user mode choice for the task takes precedence.",
          `Skill source: ${skill.filePath}`,
          `Resolve Skill references relative to: ${dirname(skill.filePath)}`,
          body,
        ].join("\n\n");
      }
      status(ctx, mode);
      lastError = undefined;
    } catch (error) {
      reportError(ctx, error);
      sections[sectionName] = `${offGuidance}\nAutomatic loading failed. Do not claim the Skill was loaded for this run.`;
    }
  });
}
