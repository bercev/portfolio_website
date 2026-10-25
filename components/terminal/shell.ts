import { portfolio } from "@/data/content";
import {
  gotoCompletionNames,
  gotoTargets,
  resolveGotoTarget,
} from "@/lib/terminal-goto";
import { searchPortfolio } from "@/lib/terminal-search";
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
  /** Jump the page to an anchor (the flyout closes first, then navigates). */
  navigate?: (hash: string) => void;
}

const JOKES: Record<string, string> = {
  emacs: "a wise choice. but this is a vim household.",
  nano: "we don't do that here.",
};

/** Compact block-letter BERAT mark for beratfetch (5 rows x 29 cols). */
const BERAT_MARK: readonly string[] = [
  "████  █████ ████    █   █████",
  "█   █ █     █   █  █ █    █  ",
  "████  ████  ████  █████   █  ",
  "█   █ █     █ █   █   █   █  ",
  "████  █████ █  █  █   █   █  ",
];

/**
 * Rotating one-liners for `fortune` — every line is verbatim (or a
 * clause-trimmed) from his own case-study prose in data/content.ts.
 * No invented quotes, per the loop's honesty rule.
 */
const FORTUNES: readonly string[] = [
  "Resume version control that cut merge conflicts 70%.",
  "The first merge implementation diffed whole documents, so concurrent edits still clobbered each other's formatting.",
  "The self-correction grounding pass stopped the hallucinated community facts.",
  "I still reach for tests before I call a feature done.",
  "Next time I'd build the evals first.",
  "A Discord assistant that answers from 10K+ of the server's own messages.",
  "Local inference over hosted APIs — cutting-edge model quality traded for zero cost and data privacy.",
  "Those sessions were a weekly pressure test for walking through recursion, graphs, and complexity out loud.",
];

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
  /** Fake-vim trap state: while true, input goes to vimCommand(), not the shell. */
  private vimMode = false;
  private fortuneIndex = 0;

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
    if (this.vimMode) {
      this.vimCommand(line);
      return;
    }
    if (line) {
      this.history.unshift(line);
      this.historyIndex = -1;
      this.run(line);
    }
    // A command may have switched modes (e.g. vim) — it owns the prompt then.
    if (!this.vimMode) this.prompt();
  }

  historyUp() {
    if (this.vimMode) return;
    if (this.history.length === 0) return;
    this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
    this.replaceBuffer(this.history[this.historyIndex]);
  }

  historyDown() {
    if (this.vimMode) return;
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
    if (this.vimMode) return;
    const tokens = this.buffer.split(/\s+/);
    const last = tokens[tokens.length - 1] ?? "";
    const isFirst = tokens.length <= 1;

    if (this.completions.length === 0 || this.completionPrefix !== last) {
      this.completionPrefix = last;
      this.completionIndex = 0;
      const projectTitles = portfolio.projects.map((p) => p.title);
      const paperTargets = portfolio.publications.map((p) => ({
        slug: p.slug,
        label: p.title,
      }));
      const candidates = isFirst
        ? COMMANDS.filter((c) => c.startsWith(last))
        : tokens[0] === "goto" && tokens.length === 2
          ? gotoCompletionNames(projectTitles, paperTargets).filter((n) =>
              n.startsWith(last),
            )
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
      // A literal space after the pad: names at/over the 14-col width
      // ("goto <chapter>", "sudo hire bercev") otherwise run straight
      // into their description with no gap.
      this.cb.writeln(`  \x1b[36m${name.padEnd(14)}\x1b[0m ${desc}`);
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

  cmdGoto(args: string[]) {
    const projectTitles = portfolio.projects.map((p) => p.title);
    const paperTargets = portfolio.publications.map((p) => ({
      slug: p.slug,
      label: p.title,
    }));
    const listTargets = () => {
      this.cb.writeln(`chapters, projects, and papers:`);
      for (const t of gotoTargets(projectTitles, paperTargets)) {
        this.cb.writeln(`  \x1b[36m${t.name.padEnd(20)}\x1b[0m${t.hash}`);
      }
    };
    if (args.length === 0) {
      listTargets();
      return;
    }
    const target = resolveGotoTarget(args.join(" "), projectTitles, paperTargets);
    if (!target) {
      this.cb.writeln(`goto: unknown target: ${args.join(" ")}`);
      listTargets();
      return;
    }
    this.cb.writeln(`\x1b[32m→ ${target.label} (${target.hash})\x1b[0m`);
    this.cb.navigate?.(target.hash);
  }

  cmdSearch(args: string[]) {
    const query = args.join(" ").trim();
    if (!query) {
      this.cb.writeln(`usage: search <keyword>`);
      return;
    }
    const hits = searchPortfolio(query, portfolio);
    if (hits.length === 0) {
      this.cb.writeln(`no matches for "${query}" — try a project, paper, or tech name.`);
      return;
    }
    this.cb.writeln(`\x1b[36m${hits.length} match${hits.length === 1 ? "" : "es"} for "${query}":\x1b[0m`);
    for (const hit of hits) {
      this.cb.writeln(`  • ${hit.label} — \x1b[33mgoto ${hit.goto}\x1b[0m`);
    }
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

  cmdBeratfetch() {
    const cyan = "\x1b[36m";
    const reset = "\x1b[0m";
    for (const row of BERAT_MARK) this.cb.writeln(`${cyan}${row}${reset}`);
    this.cb.writeln("");
    this.cb.writeln(`${cyan}berat${reset}@${cyan}portfolio${reset}`);
    this.cb.writeln(`${cyan}${"─".repeat(16)}${reset}`);
    const info: ReadonlyArray<readonly [string, string]> = [
      ["role", "Full-stack software engineer, researcher"],
      ["based", "Santa Cruz, California"],
      ["stack", "TypeScript · React · Next.js · Python · Postgres"],
      ["papers", "SkillOptimizer (ICML 2026 AIWILD) · @GrokSet (arXiv)"],
      ["shell", "bercevOS v2.6"],
      ["uptime", "as long as this tab stays open"],
    ];
    for (const [label, value] of info) {
      this.cb.writeln(`${cyan}${label.padEnd(7)}${reset} ${value}`);
    }
  }

  cmdFortune() {
    const line = FORTUNES[this.fortuneIndex % FORTUNES.length];
    this.fortuneIndex += 1;
    this.cb.writeln(`\x1b[33m${line}\x1b[0m`);
  }

  cmdCowsay(args: string[]) {
    const text = args.join(" ").trim() || "moo.";
    const words = text.split(/\s+/);
    const maxWidth = 38;
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    const width = Math.max(...lines.map((l) => l.length));
    this.cb.writeln(` ${"_".repeat(width + 2)}`);
    lines.forEach((line, i) => {
      const padded = line.padEnd(width);
      let left = "|";
      let right = "|";
      if (lines.length === 1) {
        left = "<";
        right = ">";
      } else if (i === 0) {
        left = "/";
        right = "\\";
      } else if (i === lines.length - 1) {
        left = "\\";
        right = "/";
      }
      this.cb.writeln(`${left} ${padded} ${right}`);
    });
    this.cb.writeln(` ${"-".repeat(width + 2)}`);
    this.cb.writeln(`        \\   ^__^`);
    this.cb.writeln(`         \\  (oo)\\_______`);
    this.cb.writeln(`            (__)\\       )\\/\\`);
    this.cb.writeln(`                ||----w |`);
    this.cb.writeln(`                ||     ||`);
  }

  cmdVim() {
    this.vimMode = true;
    this.cb.clear();
    this.cb.writeln(`\x1b[32m"todo.txt" [readonly] 3 lines\x1b[0m`);
    this.cb.writeln(`buy more coffee`);
    this.cb.writeln(`ship the portfolio`);
    this.cb.writeln(`touch grass (optional)`);
    this.cb.writeln(`\x1b[34m~\x1b[0m`);
    this.cb.writeln(`\x1b[34m~\x1b[0m`);
    this.cb.writeln(`\x1b[34m~\x1b[0m`);
    this.cb.writeln(`\x1b[36m-- INSERT --\x1b[0m`);
  }

  /**
   * The vim trap: a fake readonly buffer. Only :q (or :q!) exits —
   * writes are refused with authentic readonly errors.
   */
  private vimCommand(line: string) {
    if (/^:q!?$/.test(line)) {
      this.vimMode = false;
      this.cb.writeln(`\x1b[32myou escaped. most don't.\x1b[0m`);
      this.prompt();
      return;
    }
    if (/^:(w|wq|x)/.test(line)) {
      this.cb.writeln(`\x1b[31mE45: 'readonly' option is set (add ! to override)\x1b[0m`);
      return;
    }
    if (line.startsWith(":")) {
      const cmd = line.slice(1).split(/\s+/)[0];
      this.cb.writeln(`\x1b[31mE492: Not an editor command: ${cmd}\x1b[0m`);
      return;
    }
    if (line) {
      this.cb.writeln(`\x1b[31mE21: Cannot make changes, 'modifiable' is off\x1b[0m`);
    }
  }
}

const HELP_TEXT: ReadonlyArray<readonly [string, string]> = [
  ["help", "show this help"],
  ["whoami", "who is bercev"],
  ["beratfetch", "bercev, neofetch-style"],
  ["pwd", "print working directory"],
  ["ls [dir]", "list directory contents"],
  ["cd <dir>", "change directory"],
  ["cat <file>", "print file contents"],
  ["echo <text>", "print text"],
  ["projects", "list shipped projects"],
  ["publications", "list papers"],
  ["contact", "how to reach bercev"],
  ["goto <chapter>", "jump to a chapter, project, or paper"],
  ["search <keyword>", "find projects, papers, skills"],
  ["fortune", "one honest line from the case studies"],
  ["cowsay <text>", "the cow says what you type"],
  ["vim", "you have been warned"],
  ["clear", "clear the screen"],
  ["sudo hire bercev", "???"],
];

const COMMANDS = [
  ...HELP_TEXT.map(([name]) => name.split(" ")[0]),
  "hello",
  "emacs",
  "nano",
  "rm",
];

const HANDLERS: Record<string, (shell: Shell, args: string[]) => void> = {
  help: (s) => s.cmdHelp(),
  whoami: (s) => s.cmdWhoami(),
  beratfetch: (s) => s.cmdBeratfetch(),
  pwd: (s) => s.cmdPwd(),
  ls: (s, a) => s.cmdLs(a),
  cd: (s, a) => s.cmdCd(a),
  cat: (s, a) => s.cmdCat(a),
  echo: (s, a) => s.cmdEcho(a),
  clear: (s) => s.cmdClear(),
  sudo: (s, a) => s.cmdSudo(a),
  vim: (s) => s.cmdVim(),
  emacs: (s) => s.cmdJoke("emacs"),
  nano: (s) => s.cmdJoke("nano"),
  rm: (s) => s.cmdRm(),
  hello: (s) => s.cmdHello(),
  contact: (s) => s.cmdContact(),
  goto: (s, a) => s.cmdGoto(a),
  search: (s, a) => s.cmdSearch(a),
  projects: (s) => s.cmdProjects(),
  publications: (s) => s.cmdPublications(),
  fortune: (s) => s.cmdFortune(),
  cowsay: (s, a) => s.cmdCowsay(a),
};
