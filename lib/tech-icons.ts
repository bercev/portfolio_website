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
  TypeScript: siTypescript,
  MongoDB: siMongodb,
  Git: siGit,
  SQLite: siSqlite,
  PostgreSQL: siPostgresql,
  Jest: siJest,
  Neon: siNeon,
  Clerk: siClerk,
  "discord.py": siDiscord,
  Ollama: siOllama,
  LangChain: siLangchain,
  SQL: siSqlite,
  Express: siExpress,
  Zod: siZod,
  Tmux: siTmux,
  LLMs: siHuggingface,
  "CI/CD": siGithubactions,
  SCRUM: siScrumalliance,
};

export function iconForTech(name: string): SimpleIcon | null {
  return BY_NAME[name] ?? null;
}

export function techInitials(name: string): string {
  const parts = name.replace(/[./]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
