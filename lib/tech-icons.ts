import type { SimpleIcon } from "simple-icons";
import {
  siClerk,
  siDiscord,
  siDocker,
  siExpress,
  siGit,
  siGithubactions,
  siGooglegemini,
  siGooglecloud,
  siHuggingface,
  siJest,
  siLangchain,
  siMongodb,
  siNeon,
  siNextdotjs,
  siOllama,
  siPostgresql,
  siPython,
  siReact,
  siScrumalliance,
  siSqlite,
  siTmux,
  siTypescript,
  siZod,
} from "simple-icons";

const BY_NAME: Record<string, SimpleIcon> = {
  Python: siPython,
  "Google ADK": siGooglegemini,
  GCP: siGooglecloud,
  Docker: siDocker,
  React: siReact,
  NextJS: siNextdotjs,
  "Next.js": siNextdotjs,
  TypeScript: siTypescript,
  MongoDB: siMongodb,
  Git: siGit,
  SQLite: siSqlite,
  PostgreSQL: siPostgresql,
  Jest: siJest,
  Neon: siNeon,
  Clerk: siClerk,
  "discord.py": siDiscord,
  Discord: siDiscord,
  Ollama: siOllama,
  LangChain: siLangchain,
  SQL: siSqlite,
  Express: siExpress,
  Zod: siZod,
  Tmux: siTmux,
  LLMs: siHuggingface,
  RAG: siLangchain,
  "CI/CD": siGithubactions,
  SCRUM: siScrumalliance,
};

export function iconForTech(name: string): SimpleIcon | null {
  return BY_NAME[name] ?? null;
}

/** Brand fill from Simple Icons, or null when the name has no glyph. */
export function brandColorForTech(name: string): string | null {
  const icon = iconForTech(name);
  return icon ? `#${icon.hex}` : null;
}
