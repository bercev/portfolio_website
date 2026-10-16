import { portfolio } from "@/data/content";
import {
  HOME,
  buildFilesystem,
  displayPath,
  getNode,
  listNames,
  resolvePath,
  type FsDir,
} from "./filesystem";

/**
 * Tiny shell interpreter for the portfolio terminal.
 * Handles input line editing (history, tab-completion) and command dispatch.
 */

export const PROMPT_USER = "bercev";
export const PROMPT_HOST = "portfolio";

export interface ShellCallbacks {
  write: (text: string) => void;
  writeln: (text?: string) => void;
  clear: () => void;
}

const JOKES: Record<string, string> = {
  vim: "nice. now type :q to exit... oh wait, you're already stuck. this is a vim household.",
  emacs: "a wise choice. but this is a vim household.",
  nano: "we don't do that here.",
};

export class Shell {
  private root: FsDir = buildFilesystem();
  private cwd: string[] = [...HOME];
  private history: string[] = [];
  private historyIndex = -1;
  private buffer = "";
  private cursor = 0;
  private completions: string[] = [];
  private completionIndex = 0;
  private completionPrefix = "";

  constructor(private cb: ShellCallbacks) {}

  boot() {
    this.cb.writeln(`\x1b[36mbercevOS v2.6 — portfolio shell\x1b[0m`);
    this.cb.writeln(`type \x1b[33mhelp\x1b[0m to see what you can do.`);
    this.cb.writeln(``);
    this.prompt();
  }

  private prompt() {
    this.cb.write(`\x1b[32m${PROMPT_USER}@${PROMPT_HOST}\x1b[0m:\x1b[34m${displayPath(this.cwd)}\x1b[0m$ `);
  }

  /** Feed a printable character. */
  type(char: string) {
    this.completions = [];
    this.buffer =
      this.buffer.slice(0, this.cursor) + char + this.buffer.slice(this.cursor);
    this.cursor += char.length;
    this.cb.write(char);
  }

  backspace() {
    if (this.cursor === 0) return;
    this.completions = [];
    this.buffer =
      this.buffer.slice(0, this.cursor - 1) + this.buffer.slice(this.cursor);
    this.cursor -= 1;
    this.cb.write("\b \b");
  }

  enter() {
    this.cb.writeln("");
    const line = this.buffer.trim();
    this.buffer = "";
    this.cursor = 0;
    this.completions = [];
    if (line) {
      this.history.unshift(line);
      this.historyIndex = -1;
      this.run(line);
    }
    this.prompt();
  }

  historyUp() {
    if (this.history.length === 0) return;
    this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
    this.replaceBuffer(this.history[this.historyIndex]);
  }

  historyDown() {
    if (this.historyIndex <= 0) {
      this.historyIndex = -1;
      this.replaceBuffer("");
      return;
    }
    this.historyIndex -= 1;
    this.replaceBuffer(this.history[this.historyIndex]);
  }

  private replaceBuffer(text: string) {
    while (this.cursor > 0) {
      this.cb.write("\b \b");
      this.cursor -= 1;
    }
    this.buffer = "";
    for (const ch of text) this.type(ch);
    this.completions = [];
  }

  tab() {
    const tokens = this.buffer.split(/\s+/);
    const last = tokens[tokens.length - 1] ?? "";
    const isFirst = tokens.length <= 1;

    if (this.completions.length === 0 || this.completionPrefix !== last) {
      this.completionPrefix = last;
      this.completionIndex = 0;
      const candidates = isFirst
        ? COMMANDS.filter((c) => c.startsWith(last))
        : listNames(this.root, this.cwd).filter((n) => n.startsWith(last));
      this.completions = candidates;
    }
    if (this.completions.length === 0) return;
    const pick = this.completions[this.completionIndex % this.completions.length];
    this.completionIndex += 1;

    // Erase the partial token, then type the completion.
    for (let i = 0; i < last.length; i++) this.cb.write("\b \b");
    this.buffer = this.buffer.slice(0, this.buffer.length - last.length) + pick;
    this.cursor = this.buffer.length;
    this.cb.write(pick);
  }

  private run(line: string) {
    const [cmd, ...args] = line.split(/\s+/);
    const handler = HANDLERS[cmd];
    if (handler) {
      handler(this, args);
    } else if (cmd) {
      this.cb.writeln(`command not found: ${cmd} — try \x1b[33mhelp\x1b[0m`);
    }
  }

  private get cwdNode() {
    return getNode(this.root, this.cwd);
  }

  // ---- command implementations ----

  cmdHelp() {
    this.cb.writeln(`available commands:`);
    for (const [name, desc] of HELP_TEXT) {
      this.cb.writeln(`  \x1b[36m${name.padEnd(14)}\x1b[0m${desc}`);
    }
  }

  cmdWhoami() {
    this.cb.writeln(`${portfolio.identity.name} — ${portfolio.identity.role}`);
  }

  cmdPwd() {
    this.cb.writeln(displayPath(this.cwd));
  }

  cmdLs(args: string[]) {
    const target = args[0] ? resolvePath(this.cwd, args[0]) : this.cwd;
    if (!target) {
      this.cb.writeln(`ls: no such directory: ${args[0]}`);
      return;
    }
    const node = getNode(this.root, target);
    if (!node) {
      this.cb.writeln(`ls: no such file or directory: ${args[0]}`);
      return;
    }
    if (node.type === "file") {
      this.cb.writeln(args[0]);
      return;
    }
    for (const name of Object.keys(node.children)) {
      const child = node.children[name];
      this.cb.writeln(
        child.type === "dir" ? `\x1b[34m${name}/\x1b[0m` : name,
      );
    }
  }

  cmdCd(args: string[]) {
    if (!args[0]) {
      this.cwd = [...HOME];
      return;
    }
    const target = resolvePath(this.cwd, args[0]);
    const node = target ? getNode(this.root, target) : null;
    if (!node) {
      this.cb.writeln(`cd: no such file or directory: ${args[0]}`);
      return;
    }
    if (node.type !== "dir") {
      this.cb.writeln(`cd: not a directory: ${args[0]}`);
      return;
    }
    this.cwd = target!;
  }

  cmdCat(args: string[]) {
    if (!args[0]) {
      this.cb.writeln(`usage: cat <file>`);
      return;
    }
    const target = resolvePath(this.cwd, args[0]);
    const node = target ? getNode(this.root, target) : null;
    if (!node) {
      this.cb.writeln(`cat: ${args[0]}: no such file`);
      return;
    }
    if (node.type === "dir") {
      this.cb.writeln(`cat: ${args[0]}: is a directory`);
      return;
    }
    for (const line of node.content.split("\n")) this.cb.writeln(line);
  }

  cmdEcho(args: string[]) {
    this.cb.writeln(args.join(" "));
  }

  cmdClear() {
    this.cb.clear();
  }

  cmdSudo(args: string[]) {
    const rest = args.join(" ");
    if (/^hire(\s+bercev)?$/.test(rest)) {
      this.cb.writeln(`\x1b[32mpermission granted. nice choice.\x1b[0m`);
      this.cb.writeln(`email: see \x1b[33mcat contact.txt\x1b[0m`);
    } else if (rest === "rm -rf /") {
      this.cb.writeln(`nice try.`);
    } else {
      this.cb.writeln(`bercev is not in the sudoers file. this incident will be reported.`);
    }
  }

  cmdJoke(cmd: string) {
    this.cb.writeln(JOKES[cmd] ?? "");
  }

  cmdRm() {
    this.cb.writeln(`rm: permission denied — the portfolio is immutable. as it should be.`);
  }

  cmdHello() {
    this.cb.writeln(`hello, visitor. welcome to the machine.`);
  }

  cmdContact() {
    this.cmdCat(["contact.txt"]);
  }

  cmdProjects() {
    this.cb.writeln(`\x1b[36mprojects/\x1b[0m — ${portfolio.projects.length} shipped:`);
    for (const p of portfolio.projects) {
      this.cb.writeln(`  • ${p.title} (${p.dates})`);
    }
    this.cb.writeln(`tip: \x1b[33mls projects/\x1b[0m then \x1b[33mcat projects/<name>.txt\x1b[0m`);
  }

  cmdPublications() {
    this.cb.writeln(`\x1b[36mpublications/\x1b[0m — ${portfolio.publications.length} papers:`);
    for (const p of portfolio.publications) {
      this.cb.writeln(`  • ${p.title}`);
      this.cb.writeln(`    ${p.venue} — ${p.date}`);
    }
  }
}

const HELP_TEXT: ReadonlyArray<readonly [string, string]> = [
  ["help", "show this help"],
  ["whoami", "who is bercev"],
  ["pwd", "print working directory"],
  ["ls [dir]", "list directory contents"],
  ["cd <dir>", "change directory"],
  ["cat <file>", "print file contents"],
  ["echo <text>", "print text"],
  ["projects", "list shipped projects"],
  ["publications", "list papers"],
  ["contact", "how to reach bercev"],
  ["clear", "clear the screen"],
  ["sudo hire bercev", "???"],
];

const COMMANDS = [
  ...HELP_TEXT.map(([name]) => name.split(" ")[0]),
  "hello",
  "vim",
  "emacs",
  "nano",
  "rm",
];

const HANDLERS: Record<string, (shell: Shell, args: string[]) => void> = {
  help: (s) => s.cmdHelp(),
  whoami: (s) => s.cmdWhoami(),
  pwd: (s) => s.cmdPwd(),
  ls: (s, a) => s.cmdLs(a),
  cd: (s, a) => s.cmdCd(a),
  cat: (s, a) => s.cmdCat(a),
  echo: (s, a) => s.cmdEcho(a),
  clear: (s) => s.cmdClear(),
  sudo: (s, a) => s.cmdSudo(a),
  vim: (s) => s.cmdJoke("vim"),
  emacs: (s) => s.cmdJoke("emacs"),
  nano: (s) => s.cmdJoke("nano"),
  rm: (s) => s.cmdRm(),
  hello: (s) => s.cmdHello(),
  contact: (s) => s.cmdContact(),
  projects: (s) => s.cmdProjects(),
  publications: (s) => s.cmdPublications(),
};
