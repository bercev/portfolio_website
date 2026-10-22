import { portfolio } from "@/data/content";

/**
 * Virtual filesystem for the terminal, built from real portfolio content.
 * Paths look like: /home/bercev/{projects,publications,about.txt,contact.txt}
 */

export interface FsFile {
  readonly type: "file";
  readonly content: string;
}

export interface FsDir {
  readonly type: "dir";
  readonly children: Record<string, FsFile | FsDir>;
}

export type FsNode = FsFile | FsDir;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function file(content: string): FsFile {
  return { type: "file", content };
}

function dir(children: Record<string, FsFile | FsDir>): FsDir {
  return { type: "dir", children };
}

export function buildFilesystem(): FsDir {
  const projectFiles: Record<string, FsFile> = {};
  for (const p of portfolio.projects) {
    const name = slugify(p.title) + ".txt";
    projectFiles[name] = file(
      [
        `TITLE: ${p.title}`,
        `DATES: ${p.dates}`,
        ``,
        p.description,
        ``,
        `STACK: ${p.technologies.join(", ")}`,
        p.href ? `LINK: ${p.href}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const paperFiles: Record<string, FsFile> = {};
  for (const p of portfolio.publications) {
    const name = slugify(p.title) + ".txt";
    paperFiles[name] = file(
      [
        `TITLE: ${p.title}`,
        `VENUE: ${p.venue}`,
        `DATE:  ${p.date}`,
        ``,
        `IN PLAIN ENGLISH:`,
        p.gloss,
        ``,
        `PAPER: ${p.href}`,
        `PDF:   ${p.pdfUrl}`,
      ].join("\n"),
    );
  }

  const skillFiles: Record<string, FsFile> = {};
  for (const s of portfolio.skills) {
    skillFiles[slugify(s.category) + ".txt"] = file(
      `${s.category.toUpperCase()}\n${"=".repeat(s.category.length)}\n${s.items
        .map((item) => `${item.name} — ${item.note}`)
        .join("\n")}`,
    );
  }

  return dir({
    home: dir({
      bercev: dir({
        "about.txt": file(
          [
            portfolio.identity.name,
            portfolio.identity.role,
            ``,
            ...portfolio.about.bio,
            ``,
            `EDUCATION`,
            `${portfolio.about.education.institution}`,
            `${portfolio.about.education.degree} — GPA ${portfolio.about.education.gpa}`,
            portfolio.about.education.dates,
            ``,
            `COURSEWORK`,
            portfolio.about.education.coursework.join(", "),
          ].join("\n"),
        ),
        "contact.txt": file(
          [
            portfolio.contact.heading,
            ``,
            portfolio.contact.message,
            ``,
            ...portfolio.contact.links.map(
              (l) => `${l.label}: ${l.href.replace(/^mailto:/, "")}`,
            ),
          ].join("\n"),
        ),
        projects: dir(projectFiles),
        publications: dir(paperFiles),
        skills: dir(skillFiles),
      }),
    }),
  });
}

export const HOME = ["home", "bercev"];

export function resolvePath(cwd: string[], input: string): string[] | null {
  const parts = input.startsWith("/")
    ? input.split("/").filter(Boolean)
    : [...cwd, ...input.split("/").filter(Boolean)];
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (out.length === 0) return null;
      out.pop();
    } else {
      out.push(part);
    }
  }
  return out;
}

export function getNode(root: FsDir, path: string[]): FsNode | null {
  let node: FsNode = root;
  for (const part of path) {
    if (node.type !== "dir") return null;
    const next: FsNode | undefined = node.children[part];
    if (!next) return null;
    node = next;
  }
  return node;
}

export function listNames(root: FsDir, path: string[]): string[] {
  const node = getNode(root, path);
  if (!node || node.type !== "dir") return [];
  return Object.keys(node.children);
}

export function formatPath(path: string[]): string {
  return "/" + path.join("/");
}

export function displayPath(path: string[]): string {
  if (path.length === 0) return "/";
  if (path.length === 2 && path[0] === "home" && path[1] === "bercev") return "~";
  if (path[0] === "home" && path[1] === "bercev")
    return "~/" + path.slice(2).join("/");
  return formatPath(path);
}
