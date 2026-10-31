import { portfolio, type Project } from "@/data/content";
import { projectSlug } from "@/lib/project-anchor";
import {
  gotoCompletionNames,
  gotoTargets,
  resolveGotoTarget,
} from "@/lib/terminal-goto";
import { searchPortfolio, searchTerms } from "@/lib/terminal-search";
import {
  isThemePalette,
  THEME_PALETTES,
  type ThemePalette,
} from "@/lib/theme-palette";
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

/**
 * Light/dark mode names (next-themes: "system" follows the OS). Kept
 * here, not in theme-palette.ts, because modes are orthogonal to the
 * five accent palettes — the `theme` command spans both dimensions.
 */
const THEME_MODES = ["dark", "light", "system"] as const;
type ThemeMode = (typeof THEME_MODES)[number];
function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}

/**
 * Contact links openable in a new tab: every contact link that is not a
 * download. The Resume entry carries download: true (and has its own
 * `resume` command); the rest are the Elsewhere profiles. The tuple is
 * `as const`, so only the Resume member carries `download` — the `in`
 * guard is the narrowing that keeps this typecheck-clean.
 */
function openableProfiles() {
  return portfolio.contact.links.filter((l) => !("download" in l && l.download));
}

/**
 * Projects with somewhere to open: live site preferred, then source repo,
 * then the legacy href (Vitae carries live + href, the Discord bot source
 * + href — same URL either way). Projects without any link are excluded:
 * `open` lists only what it can actually open.
 */
function openableProjects() {
  // The map param widens each `as const` project literal to Project: the
  // union of literals can't be member-accessed for `live`/`source` (Vitae
  // carries no `source`, the bot no `live`), while the interface has all
  // three as optional.
  return portfolio.projects
    .map((p: Project) => ({
      title: p.title,
      slug: projectSlug(p.title),
      url: p.live ?? p.source ?? p.href,
    }))
    .filter(
      (p): p is { title: string; slug: string; url: string } =>
        p.url !== undefined,
    );
}

// Papers carry the same openable shape as projects: the data slug (the
// goto/anchor key, not a title slug — titles carry "@"/":"/trailing periods)
// plus the venue href. Every publication has an href, so this list is the
// full paper set; it exists because `open` previously covered projects only
// while `goto`/`search` already named papers by these slugs.
function openablePapers() {
  return portfolio.publications.map((p) => ({
    slug: p.slug,
    title: p.title,
    url: p.href,
    pdfUrl: p.pdfUrl,
  }));
}

export interface ShellCallbacks {
  write: (text: string) => void;
  writeln: (text?: string) => void;
  clear: () => void;
  /** Jump the page to an anchor (the flyout closes first, then navigates). */
  navigate?: (hash: string) => void;
  /**
   * Highlight one ledger skill after a `goto <skill>` landing (the
   * iter-23 reverse-navigation event, wired by the real terminal).
   * Fires even when navigate is absent (unit tests, embeds); the
   * ledger itself gates on skillHasWork, so an unlinked skill simply
   * lands on the chapter without a highlight.
   */
  highlightSkill?: (skillName: string) => void;
  /**
   * Open an external URL in a new tab (e.g. the pinned resume PDF).
   * Kept behind a callback like `navigate` so the shell stays
   * unit-testable without a window; the real terminal wires it to
   * window.open. Absent in tests/embeds, where the command just prints.
   */
  openExternal?: (url: string) => void;
  /**
   * Current site palette, read live (the shell outlives palette changes
   * made through the UI selector, so a captured value would go stale).
   * The real terminal reads document.documentElement.dataset.palette;
   * absent in tests/embeds, where the bare list simply shows no marker.
   */
  getPalette?: () => ThemePalette | null;
  /**
   * Recolor the site (the `theme` command). Kept behind a callback like
   * `navigate`/`openExternal` so the shell stays unit-testable without
   * React; the real terminal wires it to the palette provider's
   * setPalette, which persists the choice. Absent in tests/embeds,
   * where the command prints without throwing.
   */
  setPalette?: (palette: ThemePalette) => void;
  /**
   * Current light/dark mode preference, read live (the shell outlives
   * UI-toggle changes, so a captured value would go stale). The real
   * terminal reads next-themes' persisted "theme" value; absent in
   * tests/embeds, where the bare `theme` list simply omits the mode line.
   */
  getMode?: () => ThemeMode | null;
  /**
   * Switch the light/dark mode (the `theme <mode>` command). Same
   * callback precedent as setPalette: the real terminal wires it to
   * next-themes' setTheme, which persists the choice. Absent in
   * tests/embeds, where the command prints without throwing.
   */
  setMode?: (mode: ThemeMode) => void;
  /**
   * Close the terminal session (the `exit` command). Kept behind a
   * callback like `navigate` so the shell stays unit-testable without
   * React; the real terminal wires it to the flyout's close, which
   * returns focus to the trigger. Absent in tests/embeds, where the
   * command prints a no-session line instead of throwing.
   */
  close?: () => void;
  /**
   * Live terminal columns, when the shell is wired to a real xterm
   * instance. The erase path needs it: a "\b \b" triple never crosses
   * a wrapped-line boundary in xterm, so on narrow terminals editing a
   * wrapped line left the first row stale on screen while the buffer
   * stayed correct. With cols known, edits redraw the whole logical
   * line instead; without it (unit tests, embeds) the legacy
   * per-character erase is kept.
   */
  cols?: () => number;
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

/**
 * Path-aware completion candidates for a filesystem token. A bare token
 * completes against the cwd exactly as before; a token containing "/"
 * splits at its last slash, resolves the directory part against the cwd
 * (cwd-relative, "." / ".." honored, absolute paths from the root), and
 * completes the basename against that directory's children, reattaching
 * the directory prefix so the completed token stays a valid path. A
 * trailing "/" cycles the directory's children (basename ""). A leading
 * "/" resolves against the root, not the cwd — resolvePath(cwd, "")
 * would return the cwd, so "/" is substituted for an empty directory part.
 * Unresolvable directory parts (too many "..", a file in the middle)
 * yield no candidates rather than a wrong one.
 */
function completePath(root: FsDir, cwd: string[], token: string): string[] {
  const slash = token.lastIndexOf("/");
  if (slash === -1) {
    return listNames(root, cwd).filter((n) => n.startsWith(token));
  }
  const dirPart = token.slice(0, slash);
  const base = token.slice(slash + 1);
  const dirPath = resolvePath(cwd, dirPart === "" ? "/" : dirPart);
  if (!dirPath) return [];
  return listNames(root, dirPath)
    .filter((n) => n.startsWith(base))
    .map((n) => `${dirPart}/${n}`);
}

/** Optional shell wiring beyond the terminal callbacks. */
export interface ShellOptions {
  /**
   * History restored from a previous session, newest-first (the
   * terminal loads this from localStorage — run-4 iter 3). Filtered to
   * non-empty strings and capped, so a corrupt store cannot inject
   * blank entries into recall or autosuggestion.
   */
  initialHistory?: string[];
  /** Fires with a newest-first copy after every recorded command. */
  onHistoryChange?: (entries: string[]) => void;
}

export class Shell {
  private root: FsDir = buildFilesystem();
  private cwd: string[] = [...HOME];
  // Previous directory for `cd -` (bash OLDPWD). Null until the first
  // successful directory change, so a fresh shell has nothing to go back to.
  private prevCwd: string[] | null = null;
  private history: string[] = [];
  private historyIndex = -1;
  private buffer = "";
  private cursor = 0;
  private completions: string[] = [];
  private completionIndex = 0;
  private completionPrefix = "";
  /** Visible width of the prompt currently on screen (0 when none is). */
  private promptLen = 0;
  /** True while a prompt written by prompt() is the visible input line. */
  private promptOnScreen = false;
  /**
   * Fish-style autosuggestion currently shown after the cursor: the
   * remainder of the newest history entry matching the buffer prefix.
   * Display-only — never part of `buffer`, never counted in promptLen.
   * `ghost` is the DISPLAYED (possibly width-truncated) text; `ghostFull`
   * is the whole remainder, which is what accept takes — accepting a
   * truncated display would strand the buffer at a partial token with
   * the ghost suppressed at the row boundary. The display is truncated
   * so it never wraps past the buffer's last row (see renderGhost),
   * which keeps the cursor-back after it a single-row move and keeps
   * redrawLine's row math valid.
   */
  private ghost = "";
  private ghostFull = "";
  /** Fake-vim trap state: while true, input goes to vimCommand(), not the shell. */
  private vimMode = false;
  private fortuneIndex = 0;

  constructor(
    private cb: ShellCallbacks,
    private opts: ShellOptions = {},
  ) {
    this.history = (opts.initialHistory ?? [])
      .filter((entry) => typeof entry === "string" && entry.length > 0)
      .slice(0, 200);
  }

  boot() {
    this.cb.writeln(`\x1b[36mbercevOS v2.6 — portfolio shell\x1b[0m`);
    this.cb.writeln(`type \x1b[33mhelp\x1b[0m to see what you can do.`);
    this.cb.writeln(``);
    this.prompt();
  }

  private promptText() {
    return `\x1b[32m${PROMPT_USER}@${PROMPT_HOST}\x1b[0m:\x1b[34m${displayPath(this.cwd)}\x1b[0m$ `;
  }

  private prompt() {
    this.promptLen =
      PROMPT_USER.length + 1 + PROMPT_HOST.length + 1 +
      displayPath(this.cwd).length + 2;
    this.promptOnScreen = true;
    this.cb.write(this.promptText());
  }

  /**
   * Redraw the current input line after the buffer changed. oldLen is
   * the buffer length BEFORE the change: the row count must come from
   * the line as the terminal still shows it, or a deletion that
   * unwraps the last row leaves that row's glyphs behind. With cols
   * known, move up to the line's first row, erase to end of screen
   * (the input line is the bottom line, so nothing below it is real
   * content), and rewrite prompt + buffer. Without cols, fall back to
   * the legacy per-character erase. After the redraw the cursor sits
   * at the end of the buffer — the line-editing paths already assume
   * end-of-line editing, and a full rewrite is strictly more correct
   * than the old partial erase for mid-line edits too.
   */
  private redrawLine(oldLen: number) {
    const oldGhost = this.ghost;
    const cols = this.cb.cols?.();
    if (cols && cols > 0) {
      const shown = (this.promptOnScreen ? this.promptLen : 0) + oldLen;
      const rows = Math.max(1, Math.ceil(shown / cols));
      if (rows > 1) this.cb.write(`\x1b[${rows - 1}A`);
      this.cb.write("\r\x1b[J");
      if (this.promptOnScreen) this.cb.write(this.promptText());
      this.cb.write(this.buffer);
    } else {
      for (let i = 0; i < oldLen; i++) this.cb.write("\b \b");
      this.cb.write(this.buffer);
      // The cols path erases to end of screen; the legacy path does
      // not, so a stale ghost tail would survive a shrink. Erase to
      // end of line (the ghost never wraps in the cols path, and this
      // branch only runs where cols is unknown).
      if (oldGhost) this.cb.write("\x1b[K");
    }
    this.cursor = this.buffer.length;
    this.renderGhost();
  }

  /**
   * Newest history entry (newest-first storage) that extends the
   * current buffer, minus the buffer itself — the full fish
   * autosuggestion. Empty unless the cursor is at the end of a
   * non-empty buffer: a mid-line cursor has no ghost, since the
   * suggestion reads as a continuation.
   */
  private computeGhost(): string {
    if (
      !this.promptOnScreen ||
      this.buffer.length === 0 ||
      this.cursor !== this.buffer.length
    ) {
      return "";
    }
    const match = this.history.find(
      (entry) => entry.length > this.buffer.length && entry.startsWith(this.buffer),
    );
    if (!match) return "";
    return match.slice(this.buffer.length);
  }

  /**
   * Write the current ghost in dim SGR after the buffer, then move the
   * cursor back to the buffer end so the next keystroke lands on the
   * buffer, not past the ghost. The ghost is display-only: it is
   * never written into `buffer` and promptLen never counts it. With
   * cols known, the display is cut to the space left on the buffer's
   * last row, so it never adds a row (a wrapped ghost would break
   * both redrawLine's row count and the cursor-back here); at an
   * exact row boundary the display is suppressed, since xterm's
   * pending-wrap state makes "last row" ambiguous — and accept is
   * then a no-op too, since there is nothing visible to accept.
   */
  private renderGhost() {
    this.ghostFull = this.computeGhost();
    let shown = this.ghostFull;
    const cols = this.cb.cols?.();
    if (cols && cols > 0) {
      const col = (this.promptLen + this.buffer.length) % cols;
      shown = col === 0 ? "" : shown.slice(0, cols - col);
    }
    this.ghost = shown;
    if (this.ghost) {
      this.cb.write(`\x1b[2m${this.ghost}\x1b[0m`);
      this.cb.write(`\x1b[${this.ghost.length}D`);
    }
  }

  /** Accept the ghost suggestion into the buffer (Right-arrow / End). */
  acceptSuggestion() {
    if (this.vimMode) return;
    if (!this.ghost) return;
    const oldLen = this.buffer.length;
    this.buffer += this.ghostFull;
    this.completions = [];
    // Redraw erases the ghost's row span and recomputes: the buffer
    // now equals the history entry, so no ghost remains.
    this.redrawLine(oldLen);
  }

  /** Feed a printable character. */
  type(char: string) {
    this.completions = [];
    const oldLen = this.buffer.length;
    this.buffer =
      this.buffer.slice(0, this.cursor) + char + this.buffer.slice(this.cursor);
    this.cursor += char.length;
    // A visible ghost (or a newly appearing one) must be erased and
    // re-rendered, not typed over: a direct write would leave the old
    // ghost's tail on screen past the new buffer end.
    if (this.ghost || this.computeGhost()) {
      this.redrawLine(oldLen);
    } else {
      this.cb.write(char);
    }
  }

  backspace() {
    if (this.cursor === 0) return;
    this.completions = [];
    const oldLen = this.buffer.length;
    this.buffer =
      this.buffer.slice(0, this.cursor - 1) + this.buffer.slice(this.cursor);
    this.redrawLine(oldLen);
  }

  enter() {
    this.cb.writeln("");
    this.promptOnScreen = false;
    const line = this.buffer.trim();
    this.buffer = "";
    this.cursor = 0;
    this.completions = [];
    this.ghost = "";
    this.ghostFull = "";
    if (this.vimMode) {
      this.vimCommand(line);
      return;
    }
    if (line) {
      this.history.unshift(line);
      this.historyIndex = -1;
      this.opts.onHistoryChange?.([...this.history]);
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
    const oldLen = this.buffer.length;
    this.buffer = text;
    this.redrawLine(oldLen);
    this.completions = [];
  }

  tab() {
    if (this.vimMode) return;
    const tokens = this.buffer.split(/\s+/);
    const last = tokens[tokens.length - 1] ?? "";
    const isFirst = tokens.length <= 1;

    // Repeated Tab cycles the same candidate list: the token after a pick
    // IS the previous pick, so "prefix changed" must not recompute — a
    // recompute filtered by the pick itself would collapse the list to one
    // and cycling could never advance (the pre-fix behavior, where every
    // Tab just re-selected the first match). Typing or backspacing clears
    // completions, so any other token change means a fresh prefix.
    const lastPick =
      this.completions.length > 0
        ? this.completions[
            (this.completionIndex - 1 + this.completions.length) %
              this.completions.length
          ]
        : null;
    const continuing = lastPick !== null && last === lastPick;
    if (!continuing) {
      this.completionPrefix = last;
      this.completionIndex = 0;
      const projectTitles = portfolio.projects.map((p) => p.title);
      const paperTargets = portfolio.publications.map((p) => ({
        slug: p.slug,
        label: p.title,
      }));
      const skillNames = portfolio.skills.flatMap((g) =>
        g.items.map((i) => i.name),
      );
      const roleTargets = portfolio.experience.map((e) => ({
        role: e.role,
        label: e.role,
      }));
      const linkNames = openableProfiles().map((l) => l.label.toLowerCase());
      const openNames = [
        ...openableProjects().map((p) => p.slug),
        ...openablePapers().map((p) => p.slug),
      ];
      const candidates = isFirst
        ? COMMANDS.filter((c) => c.startsWith(last))
        : tokens[0] === "goto" && tokens.length === 2
          ? gotoCompletionNames(
              projectTitles,
              paperTargets,
              skillNames,
              roleTargets,
            ).filter((n) => n.startsWith(last))
          : tokens[0] === "search" && tokens.length >= 2
            ? searchTerms(portfolio).filter((t) =>
                t.startsWith(last.toLowerCase()),
              )
            : tokens[0] === "links" && tokens.length === 2
              ? linkNames.filter((n) => n.startsWith(last.toLowerCase()))
              : tokens[0] === "open" && tokens.length === 2
                ? openNames.filter((n) => n.startsWith(last.toLowerCase()))
              : tokens[0] === "open" &&
                  tokens.length === 3 &&
                  openablePapers().some(
                    (p) => p.slug === projectSlug(tokens[1]),
                  )
                ? ["pdf"].filter((n) => n.startsWith(last.toLowerCase()))
                : tokens[0] === "theme" && tokens.length === 2
                  ? [
                      ...(Object.keys(THEME_PALETTES) as ThemePalette[]),
                      ...THEME_MODES,
                    ].filter((n) => n.startsWith(last.toLowerCase()))
                  : tokens[0] === "help" && tokens.length === 2
                    ? COMMANDS.filter((n) =>
                        n.startsWith(last.toLowerCase()),
                      )
                  : completePath(this.root, this.cwd, last);
      this.completions = candidates;
    }
    if (this.completions.length === 0) return;
    const pick = this.completions[this.completionIndex % this.completions.length];
    this.completionIndex += 1;

    // Erase the partial token, then type the completion — via a full
    // line redraw, so a wrapped token leaves no stale row behind.
    const oldLen = this.buffer.length;
    this.buffer = this.buffer.slice(0, this.buffer.length - last.length) + pick;
    this.redrawLine(oldLen);
  }

  private run(line: string) {
    // History expansion is not a HANDLERS entry: "!!" is the whole line,
    // and "!! <args>" falls through to the unknown-command path below.
    // Likewise "!n" (digits only, exact token) is history expansion;
    // "!abc" or "! 1" fall through to the unknown-command path.
    if (line === "!!") {
      this.cmdBangBang();
      return;
    }
    const bangN = /^!(\d+)$/.exec(line);
    if (bangN) {
      this.cmdBangN(parseInt(bangN[1], 10));
      return;
    }
    const [cmd, ...args] = line.split(/\s+/);
    const handler = HANDLERS[cmd];
    if (handler) {
      handler(this, args);
    } else if (cmd) {
      const suggestion = suggestCommand(cmd);
      this.cb.writeln(
        suggestion
          ? `command not found: ${cmd} — did you mean "${suggestion}"? — try \x1b[33mhelp\x1b[0m`
          : `command not found: ${cmd} — try \x1b[33mhelp\x1b[0m`,
      );
    }
  }

  private get cwdNode() {
    return getNode(this.root, this.cwd);
  }

  // ---- command implementations ----

  cmdHelp(args: string[]) {
    if (args.length === 0) {
      this.cb.writeln(`available commands:`);
      for (const [name, desc] of HELP_TEXT) {
        // A literal space after the pad: names at/over the 14-col width
        // ("goto <chapter>", "sudo hire bercev") otherwise run straight
        // into their description with no gap.
        this.cb.writeln(`  \x1b[36m${name.padEnd(14)}\x1b[0m ${desc}`);
      }
      return;
    }
    // Bash `help <builtin>` precedent: a terse usage + one example, not a
    // pager. The lookup is by base command, so "help sudo hire bercev"
    // and "help sudo" both land on sudo; unknown names name the fix.
    const name = args[0].toLowerCase();
    const detail = HELP_DETAIL[name];
    if (!detail) {
      this.cb.writeln(`help: no help for "${args[0]}" — try \x1b[33mhelp\x1b[0m`);
      return;
    }
    const desc =
      HELP_TEXT.find(([n]) => n.split(" ")[0] === name)?.[1] ?? "";
    this.cb.writeln(`\x1b[36m${name}\x1b[0m — ${desc}`);
    for (const line of detail) this.cb.writeln(`  ${line}`);
  }

  cmdWhoami() {
    this.cb.writeln(`${portfolio.identity.name} — ${portfolio.identity.role}`);
  }

  cmdHistory(args: string[] = []) {
    // `history -c` (bash precedent): wipe the whole list. Unlike bash,
    // where -c alone leaves the history file untouched until a later
    // -w, this shell's Terminal persists every onHistoryChange, so
    // firing it with [] also wipes the persisted store — the next
    // mount (flyout or contact terminal, same key) starts empty.
    // The `history -c` line itself was recorded by enter() before
    // run(), so clearing here removes it too: nothing survives.
    if (args[0] === "-c") {
      this.history = [];
      this.historyIndex = -1;
      this.opts.onHistoryChange?.([]);
      this.cb.writeln(`\x1b[32m→ history cleared\x1b[0m`);
      return;
    }
    // Stored newest-first (unshift on enter); print oldest-first with
    // bash-style numbering, so the most recent command has the highest
    // number. The `history` invocation itself is already recorded by
    // enter() before run(), exactly as in a real shell.
    const oldestFirst = [...this.history].reverse();
    oldestFirst.forEach((cmd, i) => {
      this.cb.writeln(`${i + 1}  ${cmd}`);
    });
  }

  // Lines currently being expanded in this chain (synchronous only, so
  // a typed line can never land in it). A FAILED "!n" line is still
  // recorded in history, and it can sit at exactly its own numbered
  // position — e.g. "!1" as the first command ever occupies position 1,
  // so a later "!1" resolves to it and re-expands forever. The chain
  // guard below is what stops that fixed point (and !!→!n→!n chains
  // through it); without it the shell stack-overflows (caught live,
  // run-4 iter 11, before this guard existed).
  private expansionChain: string[] = [];

  cmdBangN(n: number) {
    const line = `!${n}`;
    if (this.expansionChain.includes(line)) {
      this.cb.writeln(`${line}: history expansion loop`);
      return;
    }
    // Numbering is the `history` command's own numbering: oldest-first,
    // 1-based. enter() already recorded this "!n" line at history[0], so
    // the resolvable list is everything BEFORE it (history.slice(1)) —
    // exactly the entries a preceding `history` print showed, with the
    // not-yet-typed expansion line excluded. Index-based, never
    // find-based: skipping expansion entries would shift every number
    // after them and break the printed mapping. Chains terminate: an
    // expansion line "!k" was valid only against entries older than
    // itself, so re-running it always resolves to a strictly older
    // position, and a line can never resolve to itself.
    const prior = this.history.slice(1);
    const oldestFirst = [...prior].reverse();
    if (n < 1 || n > oldestFirst.length) {
      if (oldestFirst.length === 0) {
        this.cb.writeln(`!${n}: no history entries`);
      } else {
        this.cb.writeln(
          `!${n}: no such history entry (valid range: 1-${oldestFirst.length})`,
        );
      }
      return;
    }
    const target = oldestFirst[n - 1];
    this.cb.writeln(`\x1b[32m→ ${target}\x1b[0m`);
    this.expansionChain.push(line);
    try {
      this.run(target);
    } finally {
      this.expansionChain.pop();
    }
  }

  cmdBangBang() {
    // enter() already recorded this "!!" at history[0], so the previous
    // command is the newest entry that is not itself "!!". Skipping
    // consecutive "!!" entries means a repeated "!!" re-runs the last
    // real command instead of recursing into itself; the re-run goes
    // through run() but is never recorded twice, since only enter()
    // records. With no previous command, print and never throw.
    const target = this.history.find((entry) => entry !== "!!");
    if (!target) {
      this.cb.writeln(`!!: no previous command`);
      return;
    }
    this.cb.writeln(`\x1b[32m→ ${target}\x1b[0m`);
    this.expansionChain.push("!!");
    try {
      this.run(target);
    } finally {
      this.expansionChain.pop();
    }
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
      // Bare `cd` is a successful change (to HOME), so it saves the
      // previous directory like any other cd — bash does the same.
      this.prevCwd = [...this.cwd];
      this.cwd = [...HOME];
      return;
    }
    if (args[0] === "-") {
      if (!this.prevCwd) {
        this.cb.writeln(`cd: no previous directory`);
        return;
      }
      const landed = this.prevCwd;
      this.prevCwd = [...this.cwd];
      this.cwd = landed;
      // Bash prints the landed path on `cd -`; this shell's green `→`
      // confirmation style carries it, so the path still reads plainly.
      this.cb.writeln(`\x1b[32m→ ${displayPath(this.cwd)}\x1b[0m`);
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
    // Only successful changes move prevCwd: a failed cd leaves the
    // way back intact.
    this.prevCwd = [...this.cwd];
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

  cmdExit() {
    // Mirror cmdGoto's green confirmation line before the side effect:
    // the flyout slides away over 0.45s, so the line is visible during
    // the close. Without a close callback there is no session to close.
    if (this.cb.close) {
      this.cb.writeln(`\x1b[32m→ closing terminal\x1b[0m`);
      this.cb.close();
    } else {
      this.cb.writeln(`exit: no terminal session to close`);
    }
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

  cmdResume() {
    // The pinned resume entry from data/content.ts — the same href the
    // rail/FAB menu link to — so the shell never hardcodes the asset path.
    const resume = portfolio.contact.links.find((l) => l.label === "Resume");
    if (!resume) {
      this.cb.writeln(`resume: not available`);
      return;
    }
    this.cb.writeln(`\x1b[32m→ opening resume (${resume.href})\x1b[0m`);
    this.cb.openExternal?.(resume.href);
  }

  cmdLinks(args: string[]) {
    // Openable profiles: the contact links that are NOT downloads. The
    // Resume entry carries download: true and already has its own command,
    // so `links` owns exactly the Elsewhere profiles (GitHub, LinkedIn) —
    // the same source the contact footer renders, never hardcoded labels.
    // (The tuple is `as const`, so only the Resume member carries
    // `download`; the `in` guard is the narrowing that keeps this clean.)
    const profiles = openableProfiles();
    if (args.length === 0) {
      for (const p of profiles) this.cb.writeln(`• ${p.label}`);
      const first = profiles[0]?.label.toLowerCase() ?? "github";
      this.cb.writeln(`tip: links ${first} — open a profile in a new tab`);
      return;
    }
    const name = args.join(" ").toLowerCase();
    const match = profiles.find((p) => p.label.toLowerCase() === name);
    if (!match) {
      const names = profiles.map((p) => p.label.toLowerCase()).join(", ");
      this.cb.writeln(`links: no profile "${args.join(" ")}" — try ${names}`);
      return;
    }
    this.cb.writeln(
      `\x1b[32m→ opening ${match.label.toLowerCase()} (${match.href})\x1b[0m`,
    );
    this.cb.openExternal?.(match.href);
  }

  cmdOpen(args: string[]) {
    // Mirrors cmdLinks: bare `open` lists the openable targets, `open
    // <project>` opens one. Names are title slugs (projectSlug), so
    // `open vitae`, `open ai-discord-chatbot`, and `open AI Discord
    // Chatbot` all resolve — the same slug the goto/anchor scheme uses.
    // Papers join the same list under their data slugs (skilloptimizer,
    // grokset), the keys goto/search already print — a paper's title slug
    // would be long and fragile, so only the data slug resolves.
    const projects = openableProjects();
    const papers = openablePapers();
    if (args.length === 0) {
      for (const p of projects)
        this.cb.writeln(`• ${p.title} — ${p.url}`);
      for (const p of papers)
        // Titles end with a period; strip one trailing period so the list
        // reads as a name, not a sentence fragment.
        this.cb.writeln(`• ${p.title.replace(/\.$/, "")} — ${p.url}`);
      const first = projects[0]?.slug ?? "vitae";
      const firstPaper = papers[0]?.slug ?? "skilloptimizer";
      this.cb.writeln(
        `tip: open ${first} — open a project's site or a paper in a new tab; open ${firstPaper} pdf — open a paper's PDF`,
      );
      return;
    }
    // `open <paper> pdf` opens the paper's PDF asset instead of its venue:
    // `cat publications/<slug>.txt` prints the PDF URL as text only, and
    // the venue is what bare `open <paper>` opens, so without this variant
    // a shell visitor had no in-shell path to the PDF itself (the same
    // class of gap this command closed for venues). Projects carry no PDF,
    // so the variant errors naming the paper slugs; any other second token
    // falls through to the slug path below, unchanged.
    if (args.length === 2 && args[1].toLowerCase() === "pdf") {
      const slug = projectSlug(args[0]);
      const paper = papers.find((p) => p.slug === slug);
      if (paper) {
        this.cb.writeln(
          `\x1b[32m→ opening ${paper.slug} pdf (${paper.pdfUrl})\x1b[0m`,
        );
        this.cb.openExternal?.(paper.pdfUrl);
        return;
      }
      if (projects.some((p) => p.slug === slug)) {
        const names = papers.map((p) => p.slug).join(", ");
        this.cb.writeln(
          `open: no PDF for "${args[0]}" — PDFs exist for papers only, try ${names}`,
        );
        return;
      }
      const names = [...projects, ...papers].map((p) => p.slug).join(", ");
      this.cb.writeln(
        `open: no project or paper "${args[0]}" — try ${names}`,
      );
      return;
    }
    const slug = projectSlug(args.join(" "));
    const match =
      projects.find((p) => p.slug === slug) ??
      papers.find((p) => p.slug === slug);
    if (!match) {
      const names = [...projects, ...papers].map((p) => p.slug).join(", ");
      this.cb.writeln(
        `open: no project or paper "${args.join(" ")}" — try ${names}`,
      );
      return;
    }
    this.cb.writeln(
      `\x1b[32m→ opening ${match.slug} (${match.url})\x1b[0m`,
    );
    this.cb.openExternal?.(match.url);
  }

  cmdTheme(args: string[]) {
    // Mirrors cmdLinks/cmdOpen: bare `theme` lists the targets, `theme
    // <name>` switches. Palette names/labels come from THEME_PALETTES —
    // the same source the UI theme selector renders, never hardcoded.
    // Modes are the second theme dimension (next-themes): `theme dark`
    // used to error as "no palette", even though dark/light IS a theme
    // choice on this site — the UI toggle and the shell now span the
    // same two dimensions, palettes + light/dark mode.
    const names = Object.keys(THEME_PALETTES) as ThemePalette[];
    if (args.length === 0) {
      const current = this.cb.getPalette?.() ?? null;
      for (const name of names) {
        const label = THEME_PALETTES[name].label;
        const marker = name === current ? " (current)" : "";
        this.cb.writeln(`• ${name} — ${label}${marker}`);
      }
      const mode = this.cb.getMode?.() ?? null;
      if (mode !== null) {
        this.cb.writeln(`mode: ${mode}`);
      }
      this.cb.writeln(
        `tip: theme orchid — recolor the site · theme dark — switch light/dark mode`,
      );
      return;
    }
    const name = args.join(" ").toLowerCase();
    if (isThemeMode(name)) {
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      this.cb.writeln(`\x1b[32m→ theme mode: ${label}\x1b[0m`);
      this.cb.setMode?.(name);
      return;
    }
    if (!isThemePalette(name)) {
      this.cb.writeln(
        `theme: no palette or mode "${args.join(" ")}" — try ${names.join(", ")}, dark, light, system`,
      );
      return;
    }
    this.cb.writeln(
      `\x1b[32m→ theme: ${THEME_PALETTES[name].label}\x1b[0m`,
    );
    this.cb.setPalette?.(name);
  }

  cmdGoto(args: string[]) {
    const projectTitles = portfolio.projects.map((p) => p.title);
    const paperTargets = portfolio.publications.map((p) => ({
      slug: p.slug,
      label: p.title,
    }));
    const skillNames = portfolio.skills.flatMap((g) =>
      g.items.map((i) => i.name),
    );
    const roleTargets = portfolio.experience.map((e) => ({
      role: e.role,
      label: e.role,
    }));
    const listTargets = () => {
      this.cb.writeln(`chapters, projects, papers, skills, and roles:`);
      for (const t of gotoTargets(
        projectTitles,
        paperTargets,
        skillNames,
        roleTargets,
      )) {
        // A literal space after the pad: the longest skill slug
        // ("multi-agent-systems", 20 cols) otherwise runs into its hash.
        this.cb.writeln(`  \x1b[36m${t.name.padEnd(20)}\x1b[0m ${t.hash}`);
      }
    };
    if (args.length === 0) {
      listTargets();
      return;
    }
    const target = resolveGotoTarget(
      args.join(" "),
      projectTitles,
      paperTargets,
      skillNames,
      roleTargets,
    );
    if (!target) {
      this.cb.writeln(`goto: unknown target: ${args.join(" ")}`);
      listTargets();
      return;
    }
    this.cb.writeln(`\x1b[32m→ ${target.label} (${target.hash})\x1b[0m`);
    this.cb.navigate?.(target.hash);
    // Highlight after navigating: the ledger state persists across the
    // flyout close, and the flyout's delayed landing re-asserts #skills
    // without clearing it — so the visitor lands highlighted, not bare.
    if (target.skillName) this.cb.highlightSkill?.(target.skillName);
  }

  cmdSearch(args: string[]) {
    const query = args.join(" ").trim();
    if (!query) {
      this.cb.writeln(`usage: search <keyword>`);
      return;
    }
    const hits = searchPortfolio(query, portfolio);
    if (hits.length === 0) {
      this.cb.writeln(`no matches for "${query}" — try a project, paper, role, or tech name.`);
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

  cmdExperience() {
    // Summaries carry **emphasis** markers for the rendered site; the
    // terminal prints plain text, so strip them (never trim prose).
    this.cb.writeln(`\x1b[36mexperience/\x1b[0m — ${portfolio.experience.length} roles:`);
    for (const e of portfolio.experience) {
      const org = e.organization ? ` — ${e.organization}` : ``;
      this.cb.writeln(`  • ${e.role}${org} (${e.dates})`);
      this.cb.writeln(`    ${e.summary.replace(/\*\*/g, "")}`);
    }
    this.cb.writeln(`tip: \x1b[33mgoto experience\x1b[0m for the full section`);
  }

  cmdSkills() {
    const total = portfolio.skills.reduce((n, g) => n + g.items.length, 0);
    this.cb.writeln(
      `\x1b[36mskills/\x1b[0m — ${portfolio.skills.length} categories, ${total} skills:`,
    );
    for (const g of portfolio.skills) {
      this.cb.writeln(`  ${g.category}:`);
      for (const item of g.items) {
        this.cb.writeln(`    • ${item.name} — ${item.note}`);
      }
    }
    this.cb.writeln(`tip: \x1b[33mgoto <skill>\x1b[0m to highlight it in the ledger`);
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
    this.promptOnScreen = false;
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
  ["help", "show this help — try `help <command>` for details"],
  ["whoami", "who is bercev"],
  ["beratfetch", "bercev, neofetch-style"],
  ["pwd", "print working directory"],
  ["ls [dir]", "list directory contents"],
  ["cd <dir>", "change directory; cd - goes back"],
  ["cat <file>", "print file contents"],
  ["echo <text>", "print text"],
  ["projects", "list shipped projects"],
  ["publications", "list papers"],
  ["experience", "list roles"],
  ["skills", "list skills"],
  ["contact", "how to reach bercev"],
  ["goto <chapter>", "jump to a chapter, project, paper, skill, or role"],
  ["search <keyword>", "find projects, papers, roles, skills"],
  ["fortune", "one honest line from the case studies"],
  ["cowsay <text>", "the cow says what you type"],
  ["vim", "you have been warned"],
  ["clear", "clear the screen"],
  ["exit", "close this terminal"],
  ["history [-c]", "list past commands; -c clears them"],
  ["!!", "repeat the last command"],
  ["!n", "repeat history entry n"],
  ["resume", "open the resume (PDF)"],
  ["links [name]", "open a profile in a new tab"],
  ["open <project|paper> [pdf]", "open a project's site, a paper, or a paper's PDF"],
  ["theme [palette|mode]", "recolor the site or switch light/dark mode"],
  ["sudo hire bercev", "???"],
];

// Terse per-command detail for `help <command>`: usage first, then one
// example that actually runs. Every line here must stay true to the
// command's implementation — a detail that invents syntax is worse than
// no detail. Keys are base commands (HELP_TEXT first words + the
// history-expansion tokens, which are commands but not HANDLERS entries).
const HELP_DETAIL: Record<string, readonly string[]> = {
  help: [
    "usage: help [command]",
    "example: help goto — usage and an example for one command",
  ],
  whoami: ["usage: whoami", "prints bercev's name and role"],
  beratfetch: ["usage: beratfetch", "neofetch-style summary of the site"],
  pwd: ["usage: pwd", "prints the virtual working directory"],
  ls: [
    "usage: ls [dir]",
    "example: ls projects/ — list the project files",
  ],
  cd: [
    "usage: cd <dir>",
    "example: cd projects — then cat vitae.txt",
    "cd - returns to the previous directory",
  ],
  cat: [
    "usage: cat <file>",
    "example: cat publications/skilloptimizer.txt",
  ],
  echo: ["usage: echo <text>", "example: echo hello"],
  projects: [
    "usage: projects",
    "lists shipped projects; open <slug> opens one in a new tab",
  ],
  publications: [
    "usage: publications",
    "lists papers; open <slug> opens its venue, open <slug> pdf its PDF",
  ],
  experience: [
    "usage: experience",
    "lists roles; goto <role-slug> lands on that row",
  ],
  skills: [
    "usage: skills",
    "lists skill categories; goto <skill> highlights it in the ledger",
  ],
  contact: [
    "usage: contact",
    "prints how to reach bercev (the same text as cat contact.txt)",
  ],
  goto: [
    "usage: goto <chapter|project|paper|skill|role>",
    "example: goto python — skills, highlighted; bare goto lists targets",
  ],
  search: [
    "usage: search <keyword>",
    "example: search algoverse — Tab completes search terms",
  ],
  fortune: ["usage: fortune", "one honest line from the case studies"],
  cowsay: ["usage: cowsay <text>", "example: cowsay hello"],
  vim: ["usage: vim", "you have been warned (:q quits)"],
  clear: ["usage: clear", "clears the screen"],
  exit: [
    "usage: exit",
    "closes the flyout (Esc and the [esc] button do the same)",
  ],
  history: [
    "usage: history [-c]",
    "lists past commands, oldest first, numbered for !n",
    "example: history -c — clears the list, including persisted history",
  ],
  "!!": [
    "usage: !!",
    "repeats the last command; a repeated !! re-runs the same command",
  ],
  "!n": [
    "usage: !n",
    "example: !2 — re-runs history entry 2 (the history command's numbering)",
  ],
  resume: ["usage: resume", "opens the resume PDF in a new tab"],
  links: [
    "usage: links [name]",
    "example: links github — bare links lists the profiles",
  ],
  open: [
    "usage: open <project|paper> [pdf]",
    "example: open skilloptimizer pdf — the paper's PDF, not its venue",
  ],
  theme: [
    "usage: theme [palette|mode]",
    "example: theme dark — modes: dark, light, system; palettes: ocean, orchid, citrus, forest, rose",
  ],
  sudo: [
    "usage: sudo hire bercev",
    "the only sudo that works here",
  ],
  hello: ["usage: hello", "a greeting, nothing more"],
  emacs: ["usage: emacs", "a joke at emacs' expense"],
  nano: ["usage: nano", "a joke at nano's expense"],
  rm: [
    "usage: rm ...",
    "permission denied — the portfolio is immutable, as it should be",
  ],
};

// Edit-distance between two words (plain Levenshtein: insert, delete,
// substitute — a transposition costs 2, which the threshold below absorbs
// for words of 4+ letters, e.g. "serach" -> "search").
function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let above = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        above + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      above = temp;
    }
  }
  return prev[b.length];
}

// Git ("the most similar command is") / zsh (`correct`) "did you mean"
// convention, suggestion only: the shell NEVER auto-runs the guess —
// auto-running a guessed command (git help.autocorrect=immediate) would
// surprise a visitor, and `open`/`theme`/`exit` guesses have side effects.
// Only alphabetic words are suggested, so history tokens ("!!", "!n")
// and punctuation keep the bare error; the threshold (1 for 2-letter
// words, 2 otherwise) keeps "xy" from "suggesting" ls/cd/rm at distance 2.
function suggestCommand(input: string): string | null {
  const word = input.toLowerCase();
  if (!/^[a-z]{2,}$/.test(word)) return null;
  const maxDistance = word.length <= 2 ? 1 : 2;
  let best: string | null = null;
  let bestDistance = maxDistance + 1;
  for (const candidate of COMMANDS) {
    if (!/^[a-z]+$/.test(candidate)) continue;
    const distance = levenshtein(word, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      if (distance === 0) break;
    }
  }
  return bestDistance <= maxDistance ? best : null;
}

const COMMANDS = [
  ...HELP_TEXT.map(([name]) => name.split(" ")[0]),
  "hello",
  "emacs",
  "nano",
  "rm",
];

const HANDLERS: Record<string, (shell: Shell, args: string[]) => void> = {
  help: (s, a) => s.cmdHelp(a),
  whoami: (s) => s.cmdWhoami(),
  beratfetch: (s) => s.cmdBeratfetch(),
  pwd: (s) => s.cmdPwd(),
  ls: (s, a) => s.cmdLs(a),
  cd: (s, a) => s.cmdCd(a),
  cat: (s, a) => s.cmdCat(a),
  echo: (s, a) => s.cmdEcho(a),
  clear: (s) => s.cmdClear(),
  exit: (s) => s.cmdExit(),
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
  experience: (s) => s.cmdExperience(),
  skills: (s) => s.cmdSkills(),
  fortune: (s) => s.cmdFortune(),
  history: (s, a) => s.cmdHistory(a),
  resume: (s) => s.cmdResume(),
  links: (s, a) => s.cmdLinks(a),
  open: (s, a) => s.cmdOpen(a),
  theme: (s, a) => s.cmdTheme(a),
  cowsay: (s, a) => s.cmdCowsay(a),
};
