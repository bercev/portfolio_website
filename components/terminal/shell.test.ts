import { describe, expect, it } from "vitest";

import { Shell } from "./shell";

/**
 * Drives a Shell without boot() (no prompt written) and models the
 * terminal's input line from the write stream: printable chars insert
 * at the cursor, each "\b \b" triple erases one char, and the redraw
 * sequences (cursor-up, CR, erase-below) reset the line before the
 * rewritten prompt + buffer land. ANSI color escapes are stripped.
 * writeln output is collected separately for commands that print.
 * Pass cols to wire the cols-aware redraw path (narrow terminals).
 */
function makeShell(cols?: number) {
  const printed: string[] = [];
  let line = "";
  let col = 0;
  const shell = new Shell({
    write: (text: string) => {
      const clean = text.replace(/\x1b\[[0-9;]*m/g, "");
      for (let i = 0; i < clean.length; ) {
        if (clean.startsWith("\b \b", i)) {
          if (col > 0) {
            line = line.slice(0, col - 1) + line.slice(col);
            col -= 1;
          }
          i += 3;
        } else if (clean.startsWith("\x1b[", i)) {
          const m = /^.\[(\d*)([A-Za-z])/.exec(clean.slice(i));
          if (!m) {
            i += 1;
          } else if (m[2] === "J") {
            // Erase below: the redrawn line starts fresh.
            line = "";
            col = 0;
            i += m[0].length;
          } else {
            // Cursor-up and any other CSI: no model state to change.
            i += m[0].length;
          }
        } else if (clean[i] === "\r") {
          col = 0;
          i += 1;
        } else if (clean[i] === "\b") {
          i += 1;
        } else {
          const ch = clean[i];
          if (col < line.length) {
            line = line.slice(0, col) + ch + line.slice(col + 1);
          } else {
            line += ch;
          }
          col += 1;
          i += 1;
        }
      }
    },
    writeln: (text) => {
      printed.push(text ?? "");
    },
    clear: () => {},
    ...(cols ? { cols: () => cols } : {}),
  });
  const type = (text: string) => {
    for (const ch of text) shell.type(ch);
  };
  // After enter(), the fresh prompt lands in `line`; it is UI chrome, not
  // buffer content, so tests that change directory first reset it here.
  const resetLine = () => {
    line = "";
    col = 0;
  };
  return { shell, type, printed, resetLine, get line() {
    return line;
  } };
}

describe("path-aware tab completion", () => {
  it("completes a path token inside its directory part", () => {
    const h = makeShell();
    h.type("cat publications/skill");
    h.shell.tab();
    expect(h.line).toBe("cat publications/skilloptimizer.txt");
  });

  it("cycles a trailing-slash token through the directory's children and wraps", () => {
    const h = makeShell();
    h.type("ls publications/");
    h.shell.tab();
    expect(h.line).toBe("ls publications/skilloptimizer.txt");
    h.shell.tab();
    expect(h.line).toBe("ls publications/grokset.txt");
    h.shell.tab();
    expect(h.line).toBe("ls publications/skilloptimizer.txt");
  });

  it("still completes bare tokens against the cwd", () => {
    const h = makeShell();
    h.type("cat ");
    h.shell.tab();
    expect(h.line).toBe("cat about.txt");
  });

  it("completes inside a directory after cd", () => {
    const h = makeShell();
    h.type("cd publications");
    h.shell.enter();
    h.resetLine();
    h.type("cat skill");
    h.shell.tab();
    expect(h.line).toBe("cat skilloptimizer.txt");
  });

  it("honors .. and absolute paths", () => {
    const h = makeShell();
    h.type("cd publications");
    h.shell.enter();
    h.resetLine();
    h.type("cat ../about");
    h.shell.tab();
    expect(h.line).toBe("cat ../about.txt");

    const abs = makeShell();
    abs.type("cat /home/bercev/publications/grok");
    abs.shell.tab();
    expect(abs.line).toBe("cat /home/bercev/publications/grokset.txt");
  });

  it("leaves unresolvable path tokens untouched", () => {
    const h = makeShell();
    h.type("cat nowhere/skill");
    h.shell.tab();
    expect(h.line).toBe("cat nowhere/skill");
  });

  it("completes the token to a runnable path", () => {
    const h = makeShell();
    h.type("cat publications/grok");
    h.shell.tab();
    expect(h.line).toBe("cat publications/grokset.txt");
    h.shell.enter();
    expect(h.printed.join("\n")).toContain("TITLE: @GrokSet");
  });
});

describe("wrapped-line redraw (cols known)", () => {
  it("backspace on a wrapped line leaves no stale first row", () => {
    const h = makeShell(20);
    h.type("ls publications/skilloptimizer.txt");
    h.shell.backspace();
    expect(h.line).toBe("ls publications/skilloptimizer.tx");
    for (let i = 0; i < 12; i++) h.shell.backspace();
    expect(h.line).toBe("ls publications/skill");
  });

  it("tab-cycles a wrapped token without stale rows", () => {
    const h = makeShell(16);
    h.type("cat publications/");
    h.shell.tab();
    expect(h.line).toBe("cat publications/skilloptimizer.txt");
    h.shell.tab();
    expect(h.line).toBe("cat publications/grokset.txt");
    h.shell.tab();
    expect(h.line).toBe("cat publications/skilloptimizer.txt");
  });

  it("history recall redraws a wrapped junk line to the recalled command", () => {
    const h = makeShell(20);
    h.type("ls publications/skilloptimizer.txt");
    h.shell.enter();
    h.resetLine();
    h.type("zzzzzzzzzzzzzzzzzzzzzzzzzz");
    h.shell.historyUp();
    expect(h.line).toBe(
      "bercev@portfolio:~$ ls publications/skilloptimizer.txt",
    );
  });
});

describe("history command", () => {
  it("lists past commands oldest-first with bash-style numbering", () => {
    const h = makeShell();
    h.type("whoami");
    h.shell.enter();
    h.type("pwd");
    h.shell.enter();
    h.type("history");
    h.shell.enter();
    // The `history` invocation itself is recorded before it runs, as in
    // a real shell, so it appears last with the highest number.
    expect(h.printed).toContain("1  whoami");
    expect(h.printed).toContain("2  pwd");
    expect(h.printed).toContain("3  history");
  });

  it("arrow-cycling is unchanged after listing history", () => {
    const h = makeShell();
    h.type("pwd");
    h.shell.enter();
    h.type("history");
    h.shell.enter();
    h.resetLine();
    h.shell.historyUp();
    expect(h.line).toBe("history");
    h.shell.historyUp();
    expect(h.line).toBe("pwd");
  });

  it("completes from the help-derived command list", () => {
    const h = makeShell();
    h.type("hist");
    h.shell.tab();
    expect(h.line).toBe("history");
  });
});

describe("untouched completion branches", () => {
  it("still completes the first token against commands", () => {
    const h = makeShell();
    h.type("se");
    h.shell.tab();
    expect(h.line).toBe("search");
  });

  it("still completes goto targets (paper slugs included)", () => {
    const h = makeShell();
    h.type("goto grok");
    h.shell.tab();
    expect(h.line).toBe("goto grokset");
  });
});
