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
function makeShell(
  cols?: number,
  openExternal?: (url: string) => void,
  extra?: {
    navigate?: (hash: string) => void;
    highlightSkill?: (name: string) => void;
    getPalette?: () => import("@/lib/theme-palette").ThemePalette | null;
    setPalette?: (palette: import("@/lib/theme-palette").ThemePalette) => void;
    shellOptions?: import("./shell").ShellOptions;
  },
) {
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
          } else if (m[2] === "D") {
            // Cursor-left: the ghost render's cursor-back. The ghost
            // chars stay in `line` past col until erased; `line` below
            // slices to col so it reads as the buffer, `visible` reads
            // the full on-screen line including the ghost.
            col = Math.max(0, col - (parseInt(m[1], 10) || 0));
            i += m[0].length;
          } else if (m[2] === "K") {
            // Erase to end of line: drops a stale ghost tail.
            line = line.slice(0, col);
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
    ...(openExternal ? { openExternal } : {}),
    ...(extra?.navigate ? { navigate: extra.navigate } : {}),
    ...(extra?.highlightSkill ? { highlightSkill: extra.highlightSkill } : {}),
    ...(extra?.getPalette ? { getPalette: extra.getPalette } : {}),
    ...(extra?.setPalette ? { setPalette: extra.setPalette } : {}),
  },
  extra?.shellOptions,
  );
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
    return line.slice(0, col);
  }, get visible() {
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

describe("resume command", () => {
  it("opens the pinned resume pdf through the callback", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("resume");
    h.shell.enter();
    expect(opened).toEqual(["/assets/documents/resume.pdf"]);
    expect(h.printed.some((l) => l.includes("opening resume"))).toBe(true);
  });

  it("prints without throwing when no opener is wired", () => {
    const h = makeShell();
    h.type("resume");
    expect(() => h.shell.enter()).not.toThrow();
    expect(h.printed.some((l) => l.includes("opening resume"))).toBe(true);
  });

  it("completes from the help-derived command list", () => {
    const h = makeShell();
    h.type("res");
    h.shell.tab();
    expect(h.line).toBe("resume");
  });

  it("appears in help", () => {
    const h = makeShell();
    h.type("help");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("resume"))).toBe(true);
  });
});

describe("links command", () => {
  it("lists the Elsewhere profiles, not the resume", () => {
    const h = makeShell();
    h.type("links");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("GitHub"))).toBe(true);
    expect(h.printed.some((l) => l.includes("LinkedIn"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Resume"))).toBe(false);
  });

  it("opens github through the callback", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("links github");
    h.shell.enter();
    expect(opened).toEqual(["https://github.com/bercev"]);
    expect(h.printed.some((l) => l.includes("opening github"))).toBe(true);
  });

  it("opens linkedin through the callback", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("links linkedin");
    h.shell.enter();
    expect(opened).toEqual(["https://linkedin.com/in/berat-ercevik"]);
  });

  it("matches names case-insensitively", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("links GITHUB");
    h.shell.enter();
    expect(opened).toEqual(["https://github.com/bercev"]);
  });

  it("prints the available names and opens nothing for an unknown name", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("links mastodon");
    h.shell.enter();
    expect(opened).toEqual([]);
    expect(h.printed.some((l) => l.includes("no profile"))).toBe(true);
    expect(h.printed.some((l) => l.includes("github"))).toBe(true);
  });

  it("prints without throwing when no opener is wired", () => {
    const h = makeShell();
    h.type("links github");
    expect(() => h.shell.enter()).not.toThrow();
    expect(h.printed.some((l) => l.includes("opening github"))).toBe(true);
  });

  it("completes profile names on the second token", () => {
    const h = makeShell();
    h.type("links g");
    h.shell.tab();
    expect(h.line).toBe("links github");
  });

  it("appears in help", () => {
    const h = makeShell();
    h.type("help");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("links"))).toBe(true);
  });
});

describe("open command", () => {
  it("lists the openable projects with their URLs", () => {
    const h = makeShell();
    h.type("open");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("Vitae"))).toBe(true);
    expect(h.printed.some((l) => l.includes("https://vitae.tools/"))).toBe(
      true,
    );
    expect(
      h.printed.some((l) => l.includes("AI Discord Chatbot")),
    ).toBe(true);
  });

  it("opens vitae through the callback", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open vitae");
    h.shell.enter();
    expect(opened).toEqual(["https://vitae.tools/"]);
    expect(h.printed.some((l) => l.includes("opening vitae"))).toBe(true);
  });

  it("opens the discord bot by slug", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open ai-discord-chatbot");
    h.shell.enter();
    expect(opened).toEqual(["https://github.com/bercev/Discord-Chatbot-AI"]);
  });

  it("matches a full title case-insensitively", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open AI Discord Chatbot");
    h.shell.enter();
    expect(opened).toEqual(["https://github.com/bercev/Discord-Chatbot-AI"]);
  });

  it("opens a paper by its data slug", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open skilloptimizer");
    h.shell.enter();
    expect(opened).toEqual(["https://openreview.net/forum?id=nZYF0aPAMP"]);
    expect(h.printed.some((l) => l.includes("opening skilloptimizer"))).toBe(
      true,
    );
  });

  it("opens the second paper by its data slug", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open grokset");
    h.shell.enter();
    expect(opened).toEqual(["https://arxiv.org/abs/2602.21236"]);
  });

  it("opens a paper's PDF with the pdf variant", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open skilloptimizer pdf");
    h.shell.enter();
    expect(opened).toEqual(["/assets/publications/skilloptimizer.pdf"]);
    expect(h.printed.some((l) => l.includes("opening skilloptimizer pdf"))).toBe(
      true,
    );
  });

  it("opens the second paper's PDF with the pdf variant", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open grokset pdf");
    h.shell.enter();
    expect(opened).toEqual(["/assets/publications/grokset.pdf"]);
  });

  it("errors without opening for a project's pdf variant", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open vitae pdf");
    h.shell.enter();
    expect(opened).toEqual([]);
    expect(h.printed.some((l) => l.includes("no PDF"))).toBe(true);
    expect(h.printed.some((l) => l.includes("skilloptimizer"))).toBe(true);
  });

  it("errors without opening for an unknown slug's pdf variant", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open nope pdf");
    h.shell.enter();
    expect(opened).toEqual([]);
    expect(h.printed.some((l) => l.includes("no project or paper"))).toBe(
      true,
    );
  });

  it("completes pdf after a paper slug", () => {
    const h = makeShell();
    h.type("open grokset p");
    h.shell.tab();
    expect(h.line).toBe("open grokset pdf");
  });

  it("names the pdf variant in the bare open tip", () => {
    const h = makeShell();
    h.type("open");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("open skilloptimizer pdf"))).toBe(
      true,
    );
  });

  it("lists papers alongside projects for bare open", () => {
    const h = makeShell();
    h.type("open");
    h.shell.enter();
    expect(
      h.printed.some((l) => l.includes("https://openreview.net/forum")),
    ).toBe(true);
    expect(h.printed.some((l) => l.includes("https://arxiv.org/abs/"))).toBe(
      true,
    );
  });

  it("names paper slugs in the unknown-target error", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open nope");
    h.shell.enter();
    expect(opened).toEqual([]);
    expect(h.printed.some((l) => l.includes("skilloptimizer"))).toBe(true);
  });

  it("completes a paper slug after open", () => {
    const h = makeShell();
    h.type("open sk");
    h.shell.tab();
    expect(h.line).toBe("open skilloptimizer");
  });

  it("prints the available slugs and opens nothing for an unknown project", () => {
    const opened: string[] = [];
    const h = makeShell(undefined, (url) => opened.push(url));
    h.type("open nope");
    h.shell.enter();
    expect(opened).toEqual([]);
    expect(h.printed.some((l) => l.includes("no project"))).toBe(true);
    expect(h.printed.some((l) => l.includes("vitae"))).toBe(true);
  });

  it("prints without throwing when no opener is wired", () => {
    const h = makeShell();
    h.type("open vitae");
    expect(() => h.shell.enter()).not.toThrow();
    expect(h.printed.some((l) => l.includes("opening vitae"))).toBe(true);
  });

  it("completes project slugs on the second token", () => {
    const h = makeShell();
    h.type("open v");
    h.shell.tab();
    expect(h.line).toBe("open vitae");
  });

  it("appears in help", () => {
    const h = makeShell();
    h.type("help");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("open <project|paper>"))).toBe(true);
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

describe("experience command", () => {
  it("lists every role with organization and dates", () => {
    const h = makeShell();
    h.type("experience");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("AI Systems Engineer Intern"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Stealth Startup"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Apr 2026-Aug 2026"))).toBe(true);
    expect(h.printed.some((l) => l.includes("LLM Researcher"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Algoverse"))).toBe(true);
    expect(h.printed.some((l) => l.includes("SWE Intern"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Trustd.ai"))).toBe(true);
  });

  it("prints summaries with emphasis markers stripped, prose intact", () => {
    const h = makeShell();
    h.type("experience");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("**"))).toBe(false);
    expect(
      h.printed.some((l) => l.includes("100+ upper-division students per quarter")),
    ).toBe(true);
  });

  it("completes from the help-derived command list", () => {
    const h = makeShell();
    h.type("exp");
    h.shell.tab();
    expect(h.line).toBe("experience");
  });

  it("appears in help", () => {
    const h = makeShell();
    h.type("help");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("experience"))).toBe(true);
  });
});

describe("search covers experience roles", () => {
  it("finds a role by employer and prints its goto target", () => {
    const h = makeShell();
    h.type("search algoverse");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("LLM Researcher"))).toBe(true);
    expect(h.printed.some((l) => l.includes("goto llm-researcher"))).toBe(
      true,
    );
  });

  it("advertises roles in help and in the no-match hint", () => {
    const h = makeShell();
    h.type("help");
    h.shell.enter();
    expect(
      h.printed.some((l) => l.includes("find projects, papers, roles, skills")),
    ).toBe(true);
    const miss = makeShell();
    miss.type("search definitelyNotAKeyword");
    miss.shell.enter();
    expect(miss.printed.some((l) => l.includes("role"))).toBe(true);
  });
});

describe("goto lands on a skill", () => {
  it("navigates to #skills and highlights the canonical skill name", () => {
    const nav: string[] = [];
    const highlighted: string[] = [];
    const h = makeShell(undefined, undefined, {
      navigate: (hash) => {
        nav.push(hash);
      },
      highlightSkill: (name) => {
        highlighted.push(name);
      },
    });
    h.type("goto data structures");
    h.shell.enter();
    expect(nav).toEqual(["#skills"]);
    expect(highlighted).toEqual(["Data Structures"]);
    expect(h.printed.some((l) => l.includes("Data Structures"))).toBe(true);
  });

  it("completes a skill slug and lists skills in the bare goto dump", () => {
    const h = makeShell();
    h.type("goto data-");
    h.shell.tab();
    expect(h.line).toBe("goto data-structures");
    const list = makeShell();
    list.type("goto");
    list.shell.enter();
    expect(list.printed.some((l) => l.includes("data-structures"))).toBe(true);
    expect(list.printed.some((l) => l.includes("skills, and roles"))).toBe(
      true,
    );
  });

  it("does not highlight on an unknown target", () => {
    const highlighted: string[] = [];
    const h = makeShell(undefined, undefined, {
      highlightSkill: (name) => {
        highlighted.push(name);
      },
    });
    h.type("goto not-a-skill");
    h.shell.enter();
    expect(highlighted).toEqual([]);
  });
});

describe("goto lands on a role", () => {
  it("navigates to the role row without highlighting", () => {
    const nav: string[] = [];
    const highlighted: string[] = [];
    const h = makeShell(undefined, undefined, {
      navigate: (hash) => {
        nav.push(hash);
      },
      highlightSkill: (name) => {
        highlighted.push(name);
      },
    });
    h.type("goto llm-researcher");
    h.shell.enter();
    expect(nav).toEqual(["#role-llm-researcher"]);
    expect(highlighted).toEqual([]);
    expect(h.printed.some((l) => l.includes("LLM Researcher"))).toBe(true);
  });

  it("completes a role slug and lists roles in the bare goto dump", () => {
    const h = makeShell();
    h.type("goto llm-");
    h.shell.tab();
    expect(h.line).toBe("goto llm-researcher");
    const list = makeShell();
    list.type("goto");
    list.shell.enter();
    expect(list.printed.some((l) => l.includes("llm-researcher"))).toBe(true);
    expect(list.printed.some((l) => l.includes("#role-llm-researcher"))).toBe(
      true,
    );
  });

  it("still lands on the chapter for the chapter alias", () => {
    const nav: string[] = [];
    const h = makeShell(undefined, undefined, {
      navigate: (hash) => {
        nav.push(hash);
      },
    });
    h.type("goto experience");
    h.shell.enter();
    expect(nav).toEqual(["#experience"]);
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

describe("search tab completion", () => {
  it("completes a search term from the searched vocabulary", () => {
    const h = makeShell();
    h.type("search py");
    // The first pick is "py" itself (a term via discord.py), so the line
    // only visibly advances on the second Tab — the same cycling
    // contract as the goto/path branches, where an exact match is a pick.
    h.shell.tab();
    expect(h.line).toBe("search py");
    h.shell.tab();
    expect(h.line).toBe("search python");
  });

  it("cycles through prefix matches without leaving the search domain", () => {
    const h = makeShell();
    h.type("search d");
    h.shell.tab();
    const first = h.line;
    expect(first).toMatch(/^search d[a-z0-9]+$/);
    h.shell.tab();
    expect(h.line).toMatch(/^search d[a-z0-9]+$/);
    expect(h.line).not.toBe(first);
    expect(h.line).not.toContain("/");
  });

  it("leaves unmatched search tokens untouched", () => {
    const h = makeShell();
    h.type("search zzz");
    h.shell.tab();
    expect(h.line).toBe("search zzz");
  });

  it("never falls through to path completion for search arguments", () => {
    const h = makeShell();
    h.type("search skills/");
    h.shell.tab();
    expect(h.line).toBe("search skills/");
  });

  it("a Tab-completed term runs and matches", () => {
    const h = makeShell();
    h.type("search py");
    h.shell.tab();
    h.shell.tab();
    expect(h.line).toBe("search python");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("Python"))).toBe(true);
  });
});

describe("fish-style history autosuggestion", () => {
  it("shows the newest matching history entry as ghost text, never in the buffer", () => {
    const h = makeShell();
    h.type("goto skills");
    h.shell.enter();
    h.resetLine();
    h.type("got");
    expect(h.line).toBe("got");
    expect(h.visible).toBe("goto skills");
  });

  it("prefers the newest entry when several match", () => {
    const h = makeShell();
    h.type("goto skills");
    h.shell.enter();
    h.resetLine();
    h.type("goto projects");
    h.shell.enter();
    h.resetLine();
    h.type("got");
    expect(h.visible).toBe("goto projects");
  });

  it("shows nothing for a non-matching prefix, and accept is a no-op there", () => {
    const h = makeShell();
    h.type("goto skills");
    h.shell.enter();
    h.resetLine();
    h.type("xyz");
    expect(h.visible).toBe("xyz");
    h.shell.acceptSuggestion();
    expect(h.line).toBe("xyz");
  });

  it("accepts the ghost into the buffer, and a divergent keystroke clears it", () => {
    const h = makeShell();
    h.type("goto skills");
    h.shell.enter();
    h.resetLine();
    h.type("got");
    h.shell.acceptSuggestion();
    expect(h.line).toBe("goto skills");
    expect(h.visible).toBe("goto skills");
    h.shell.backspace();
    h.shell.backspace();
    // Buffer "goto skil" still prefixes the entry, so a shorter ghost returns.
    expect(h.line).toBe("goto skil");
    expect(h.visible).toBe("goto skills");
  });

  it("on a narrow terminal accepts the FULL remainder, not the truncated display, then backspaces cleanly on the wrapped line", () => {
    // Prompt is 20 cols (bercev@portfolio:~$ ); at 26 cols, typing
    // "goto" leaves 2 cols, so the display is cut to " s" while the
    // full remainder is " skills".
    const h = makeShell(26);
    h.type("goto skills");
    h.shell.enter();
    h.resetLine();
    h.type("goto");
    // The cols redraw path rewrites the prompt into the harness line.
    expect(h.line).toBe("bercev@portfolio:~$ goto");
    expect(h.visible).toBe("bercev@portfolio:~$ goto s");
    h.shell.acceptSuggestion();
    expect(h.line).toBe("bercev@portfolio:~$ goto skills");
    h.shell.backspace();
    expect(h.line).toBe("bercev@portfolio:~$ goto skill");
    expect(h.visible).toBe("bercev@portfolio:~$ goto skills");
  });
});

describe("persisted history (run-4 iter 3)", () => {
  it("recalls restored entries with Up-arrow and suggests from them", () => {
    const h = makeShell(undefined, undefined, {
      shellOptions: { initialHistory: ["goto skills", "whoami"] },
    });
    h.shell.historyUp();
    expect(h.line).toBe("goto skills");
    h.shell.historyDown();
    // The ghost renders only with a prompt on screen, so run a command
    // first (as the existing autosuggestion tests do), then type a
    // prefix of a restored entry.
    h.type("pwd");
    h.shell.enter();
    h.resetLine();
    h.type("who");
    expect(h.visible).toBe("whoami");
  });

  it("fires onHistoryChange newest-first after each recorded command", () => {
    const seen: string[][] = [];
    const h = makeShell(undefined, undefined, {
      shellOptions: {
        initialHistory: ["whoami"],
        onHistoryChange: (entries) => seen.push(entries),
      },
    });
    h.type("pwd");
    h.shell.enter();
    expect(seen).toEqual([["pwd", "whoami"]]);
  });

  it("ignores blank restored entries", () => {
    const h = makeShell(undefined, undefined, {
      shellOptions: { initialHistory: ["", "whoami"] },
    });
    h.shell.historyUp();
    expect(h.line).toBe("whoami");
  });
});

describe("theme command (run-4 iter 5)", () => {
  it("lists all five palettes with the current one marked", () => {
    const h = makeShell(undefined, undefined, { getPalette: () => "ocean" });
    h.type("theme");
    h.shell.enter();
    for (const name of ["ocean", "orchid", "citrus", "forest", "rose"]) {
      expect(h.printed.some((l) => l.startsWith(`• ${name} —`))).toBe(true);
    }
    expect(h.printed.some((l) => l === "• ocean — Ocean (current)")).toBe(true);
    expect(h.printed.some((l) => l.includes("tip: theme orchid"))).toBe(true);
  });

  it("switches to a valid palette through the callback", () => {
    const seen: string[] = [];
    const h = makeShell(undefined, undefined, {
      setPalette: (p) => seen.push(p),
    });
    h.type("theme orchid");
    h.shell.enter();
    expect(seen).toEqual(["orchid"]);
    expect(h.printed.some((l) => l.includes("theme: Orchid"))).toBe(true);
  });

  it("prints without throwing when no palette callback is wired", () => {
    const h = makeShell();
    h.type("theme rose");
    h.shell.enter();
    expect(h.printed.some((l) => l.includes("theme: Rose"))).toBe(true);
  });

  it("rejects an unknown palette with the valid names", () => {
    const h = makeShell();
    h.type("theme ultraviolet");
    h.shell.enter();
    expect(
      h.printed.some((l) =>
        l.includes('theme: no palette "ultraviolet" — try ocean, orchid, citrus, forest, rose'),
      ),
    ).toBe(true);
  });

  it("completes palette names and appears in help", () => {
    const h = makeShell();
    h.type("theme o");
    h.shell.tab();
    expect(h.line).toBe("theme ocean");
    h.shell.tab();
    expect(h.line).toBe("theme orchid");
    const h2 = makeShell();
    h2.type("help");
    h2.shell.enter();
    expect(h2.printed.some((l) => l.includes("theme [palette]"))).toBe(true);
  });
});

describe("skills command (run-4 iter 6)", () => {
  it("lists every category with its skills and notes", () => {
    const h = makeShell();
    h.type("skills");
    h.shell.enter();
    for (const category of ["AI & agents", "Full-stack", "Systems & delivery", "Foundations"]) {
      expect(h.printed.some((l) => l.includes(category))).toBe(true);
    }
    expect(h.printed.some((l) => l.includes("Python — Discord bot + research"))).toBe(true);
    expect(h.printed.some((l) => l.includes("TypeScript — Shipped in Vitae"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Docker — Shipped in Vitae"))).toBe(true);
    expect(h.printed.some((l) => l.includes("Data Structures — Tutored DSA at UC Santa Cruz"))).toBe(true);
    // The tip colors `goto <skill>` with an ANSI code, so the two fragments
    // never sit contiguously — assert both halves instead of the joined string.
    expect(h.printed.some((l) => l.includes("goto <skill>"))).toBe(true);
    expect(h.printed.some((l) => l.includes("highlight it in the ledger"))).toBe(true);
  });

  it("completes from the help-derived command list and appears in help", () => {
    const h = makeShell();
    h.type("ski");
    h.shell.tab();
    expect(h.line).toBe("skills");
    const h2 = makeShell();
    h2.type("help");
    h2.shell.enter();
    expect(h2.printed.some((l) => l.includes("skills"))).toBe(true);
  });
});
