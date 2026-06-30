import fs from "fs";
import path from "path";

const PROMPTS_DIR = path.join(process.cwd(), "src/lib/prompts");

function readTemplate(filename: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, filename), "utf-8");
}

export function buildOrchestratorSystemPrompt(): string {
  return readTemplate("ugcraft-director.system.md").trim();
}

export function getChatSystemPrompt(): string {
  return readTemplate("ugcraft-chat.system.md").trim();
}
