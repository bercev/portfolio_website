export type SectionId =
  | "home"
  | "about"
  | "publications"
  | "experience"
  | "projects"
  | "skills"
  | "contact";

export interface ExternalLink {
  readonly label: string;
  readonly href: string;
  readonly download?: boolean;
}

export interface Publication {
  readonly slug: string;
  readonly title: string;
  /** Plain-English gloss — the paper's claim without the title's jargon. */
  readonly gloss: string;
  readonly venue: string;
  readonly date: string;
  readonly href: string;
  readonly pdfUrl: string;
  readonly authors: readonly { name: string; orcid?: string }[];
  /** Ready-to-copy BibTeX entry. */
  readonly bibtex: string;
  readonly preview: {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
    readonly isPlaceholder: boolean;
  };
}

export interface Experience {
  readonly role: string;
  readonly organization?: string;
  readonly dates: string;
  readonly summary: string;
  readonly technologies: readonly string[];
}

export interface ProjectCaseStudy {
  /** The problem this project solved — the "why". */
  readonly problem: string;
  /** The key technical decision and why it was made. */
  readonly decision: string;
  /** The outcome in prose. */
  readonly outcome: string;
  /** Standalone metric lines — rendered bold next to the outcome. */
  readonly metrics?: readonly string[];
  readonly role?: string;
  readonly team?: string;
  readonly timeline?: string;
  /** What didn't work — the honest failure that taught something. */
  readonly didntWork?: string;
  /** Engineering trade-offs behind the decisions. */
  readonly tradeoffs?: string;
}

export interface Project {
  readonly title: string;
  /**
   * The 30-second problem+proof headline rendered as the row's title at rest —
   * states the problem solved, not the product name (e.g. "Resume version
   * control that cut merge conflicts 70%"). `title` stays the product name and
   * keeps its identity uses (keys, terminal file names, preview lookup).
   */
  readonly framing: string;
  readonly dates: string;
  readonly description: string;
  readonly technologies: readonly string[];
  /** Legacy single link — prefer `live` / `source` below. */
  readonly href?: string;
  /** Live demo / shipped product URL. */
  readonly live?: string;
  /** Source-code repository URL. */
  readonly source?: string;
  readonly caseStudy?: ProjectCaseStudy;
}

export interface PortfolioContent {
  readonly identity: {
    readonly name: string;
    readonly shortName: string;
    readonly role: string;
  };
  readonly navigation: readonly {
    readonly id: SectionId;
    readonly label: string;
  }[];
  readonly hero: {
    readonly tagline: string;
    readonly bio: string;
    /** Masthead rail — the three facts a recruiter needs off the first screen. */
    readonly signals: readonly {
      readonly label: string;
      readonly value: string;
    }[];
  };
  readonly about: {
    readonly bio: readonly string[];
    readonly education: {
      readonly institution: string;
      readonly degree: string;
      readonly gpa: string;
      readonly dates: string;
      readonly coursework: readonly string[];
    };
  };
  readonly publications: readonly Publication[];
  readonly experience: readonly Experience[];
  readonly projects: readonly Project[];
  readonly skills: readonly {
    readonly category: string;
    readonly items: readonly { readonly name: string; readonly note: string }[];
  }[];
  readonly contact: {
    readonly heading: string;
    readonly message: string;
    readonly links: readonly ExternalLink[];
  };
}

const github = {
  label: "GitHub",
  href: "https://github.com/bercev",
} as const satisfies ExternalLink;

const linkedin = {
  label: "LinkedIn",
  href: "https://linkedin.com/in/berat-ercevik",
} as const satisfies ExternalLink;

const resume = {
  label: "Resume",
  href: "/assets/documents/resume.pdf",
  download: true,
} as const satisfies ExternalLink;

// Contact is handled via the on-site form (see app/api/contact/route.ts) so the
// address stays private. Configure CONTACT_TO_EMAIL in the environment.
const profileLinks = [github, linkedin, resume] as const;

export const portfolio = {
  identity: {
    name: "Berat Ercevik",
    shortName: "Berat",
    role: "Software Engineer",
  },
  navigation: [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "publications", label: "Publications" },
    { id: "experience", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "contact", label: "Contact" },
  ],
  hero: {
    tagline:
      "Full-stack software engineer, researcher",
    bio: "I write software first and study how LLMs behave in the wild. I recently finished an AI Systems Engineer internship building multi-agent pipelines, with SkillOptimizer (ICML 2026 AIWILD Workshop) and @GrokSet (arXiv), while finishing CS at UC Santa Cruz (4.0).",
    signals: [
      { label: "Now", value: "Building products" },
      { label: "Published", value: "ICML 2026 AIWILD · arXiv" },
      { label: "Open to", value: "Software engineering roles" },
    ],
  },
  about: {
    bio: [
      "I started coding in seventh grade because I liked making things that actually did something. In high school that grew into CS classes, AP CS, and a hackathon where my team took third. Building with other people clicked for me there, and I wanted more of it.",
      "After high school I built an AI Discord chatbot for a real community. I was obsessed with it. People actually used it, asked it things, and leaned on it in the server, and watching that land taught me how much it means when software reaches someone outside your own laptop.",
      "Then I interned at Trustd.ai before college. That was my first real look at professional software. I worked with a mentor, sat in code review, took feedback that made my work sharper, and watched how production systems are designed, tested, and kept alive. A lot of how I think about shipping came from that room.",
      "When I started at UC Santa Cruz, my curiosity pulled hard toward AI and agents. Through Algoverse I researched how people talk to LLMs in the wild and helped build @GrokSet. I also worked on SkillOptimizer for the ICML 2026 AIWILD Workshop, digging into how agents can get better at skills without heavy task supervision. Alongside that I tutored DSA for upper division students, which forced me to explain hard ideas clearly under real time pressure.",
    ],
    education: {
      institution: "UC Santa Cruz",
      degree: "B.S. Computer Science",
      gpa: "4.0/4.0",
      dates: "Sep 2024-Dec 2026",
      coursework: [
        "DSA",
        "AI",
        "ML",
        "Computer Architecture",
        "Compiler Design",
        "Computer Systems Design",
        "Software Engineering",
      ],
    },
  },
  publications: [
    {
      slug: "skilloptimizer",
      title:
        "SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision.",
      gloss:
        "How an agent can get measurably better at a skill by decomposing it into subskills, with no task-level supervision to learn from.",
      venue: "ICML 2026 AIWILD Workshop",
      date: "2026",
      href: "https://openreview.net/forum?id=nZYF0aPAMP",
      pdfUrl: "/assets/publications/skilloptimizer.pdf",
      authors: [{ name: "Berat Ercevik" }],
      bibtex: `@inproceedings{ercevik2026skilloptimizer,
  title={SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision},
  author={Berat Ercevik},
  booktitle={ICML 2026 AIWILD Workshop},
  year={2026},
  url={https://openreview.net/forum?id=nZYF0aPAMP}
}`,
      preview: {
        src: "/assets/publications/skilloptimizer.png",
        alt: "First-page preview of the SkillOptimizer paper.",
        width: 817,
        height: 867,
        isPlaceholder: false,
      },
    },
    {
      slug: "grokset",
      title: "@GrokSet: Multi-party Human-LLM Interactions in Social Media.",
      gloss:
        "A dataset and analysis of 1M+ public Grok conversations: what changes when people talk to an LLM in front of an audience instead of alone.",
      venue: "arXiv:2602.21236",
      date: "February 2026",
      href: "https://arxiv.org/abs/2602.21236",
      pdfUrl: "/assets/publications/grokset.pdf",
      authors: [{ name: "Berat Ercevik" }],
      bibtex: `@article{ercevik2026grokset,
  title={{@GrokSet}: Multi-party Human-LLM Interactions in Social Media},
  author={Berat Ercevik},
  journal={arXiv preprint arXiv:2602.21236},
  year={2026},
  url={https://arxiv.org/abs/2602.21236}
}`,
      preview: {
        src: "/assets/publications/grokset.png",
        alt: "First-page preview of the @GrokSet paper.",
        width: 795,
        height: 870,
        isPlaceholder: false,
      },
    },
  ],
  experience: [
    {
      role: "AI Systems Engineer Intern",
      organization: "Stealth Startup",
      dates: "Apr 2026-Aug 2026",
      summary:
        "Built a multi-agent system that creates software from multimodal, source-based evidence: structured handoffs, persistent execution state, inspectable artifacts, and **a sandboxed build-and-repair loop that only stopped when acceptance checks passed**. I owned the contracts between agents so a failed step was visible, replayable, and not a silent stall.",
      technologies: ["Python", "Google ADK", "GCP", "Docker"],
    },
    {
      role: "DSA Tutor",
      organization: "UCSC",
      dates: "Apr 2025-Jun 2026",
      summary:
        "I supported **100+ upper-division students per quarter** through office hours and project guidance, explaining data structures, algorithmic tradeoffs, and debugging strategies while collaborating with faculty and teaching assistants on consistent evaluation. Those sessions were a weekly pressure test for walking through recursion, graphs, and complexity out loud.",
      technologies: ["Data Structures", "Algorithms"],
    },
    {
      role: "LLM Researcher",
      organization: "Algoverse",
      dates: "Jun 2025-Jan 2026",
      summary:
        "Built and analyzed **@GrokSet (1M+ tweets of public Grok conversations)**, fine-tuned BERTopic on conversation-level embeddings, and ran concurrent collection/debug workflows that **cut API and compute cost ~50%**. The same pipeline later became the paper, so the research and the engineering sat in the same week.",
      technologies: ["LLMs", "Python", "Hydra", "Tmux", "Runpod", "SQLite"],
    },
    {
      role: "SWE Intern",
      organization: "Trustd.ai",
      dates: "Oct 2024-Feb 2025",
      summary:
        "Shipped admin + REST MongoDB workflows for large user-record sets with Zod validation, then hardened Amplify CI/CD and **expanded Playwright/Jest coverage (~60%)**. That was my first production codebase, and it is why I still reach for tests before I call a feature done.",
      technologies: ["React", "NextJS", "TypeScript", "MongoDB", "AWS", "Git", "SCRUM"],
    },
  ],
  projects: [
    {
      title: "Vitae",
      framing: "Resume version control that cut merge conflicts 70%",
      dates: "Jan 2026-Jun 2026",
      description:
        "Resume building and version-control platform shipped with a 5-person Agile team. Postgres (Docker/Neon), Clerk auth, GitHub Actions + Netlify CI/CD; ~30% faster API responses, ~70% fewer merge conflicts, 99.9% uptime.",
      technologies: [
        "NextJS",
        "TypeScript",
        "PostgreSQL",
        "Docker",
        "Clerk",
      ],
      href: "https://vitae.tools/",
      live: "https://vitae.tools/",
      caseStudy: {
        problem:
          "Resumes live in a dozen files and tabs. Every edit risks overwriting someone else's work, and teams reviewing candidates lose real progress to conflicting versions.",
        decision:
          "Git-style version control for resumes: branch, diff, and merge on top of Postgres. Clerk handled auth so the team could spend its sprints on the product instead of identity, and Docker plus Neon gave us local/prod parity without ops overhead.",
        outcome:
          "Shipped on CI/CD with deploys on every merge. The numbers held up in production:",
        metrics: [
          "~30% faster API responses",
          "~70% fewer merge conflicts",
          "99.9% uptime",
        ],
        role: "Full-stack engineer",
        team: "5-person Agile team (SCRUM)",
        timeline: "Jan 2026 – Jun 2026",
        didntWork:
          "The first merge implementation diffed whole documents, so concurrent edits still clobbered each other's formatting. Rewriting the merge to diff at the block level is where the 70% drop came from.",
        tradeoffs:
          "Neon serverless Postgres in prod with Docker Postgres locally — managed scaling in exchange for serverless connection-pooling care. Clerk for auth — a bespoke identity system traded for sprint speed. Deploys on every merge — build minutes traded for zero-drama releases.",
      },
    },
    {
      title: "AI Discord Chatbot",
      framing:
        "A Discord assistant that answers from 10K+ of the server's own messages",
      dates: "Aug 2024-Sep 2024",
      description:
        "Llama 3 Discord assistant with multi-agent RAG and self-correction (10K+ indexed messages, 50+ community members).",
      technologies: ["Python", "discord.py", "Ollama", "LangChain", "AWS"],
      href: "https://github.com/bercev/Discord-Chatbot-AI",
      source: "https://github.com/bercev/Discord-Chatbot-AI",
      caseStudy: {
        problem:
          "A 50+ member Discord community kept re-asking the same questions. Moderators couldn't be everywhere at once.",
        decision:
          "Llama 3 served locally through Ollama — zero inference cost and community data never leaves the box — with multi-agent RAG over 10K+ indexed community messages so answers stay grounded in what the community actually said, plus a self-correction loop.",
        outcome:
          "A bot the community actually leans on — questions answered from the server's own history instead of a moderator's evenings:",
        metrics: ["10K+ messages indexed", "50+ community members"],
        role: "Sole developer",
        team: "Solo",
        timeline: "Aug 2024 – Sep 2024",
        didntWork:
          "The first version answered straight from the base model and hallucinated community-specific facts. Grounding every answer in the indexed messages — and adding the self-correction pass — killed that.",
        tradeoffs:
          "Local inference over hosted APIs — cutting-edge model quality traded for zero cost and data privacy. RAG over the community's own history — general knowledge traded for answers rooted in the server's own context.",
      },
    },
  ],
  skills: [
    {
      category: "AI & agents",
      items: [
        { name: "Python", note: "Discord bot + research" },
        { name: "LLMs", note: "Research area — see publications" },
        { name: "Multi-agent systems", note: "Internship + research" },
        { name: "RAG", note: "Shipped in the Discord bot" },
        { name: "LangChain", note: "Shipped in the Discord bot" },
        { name: "Ollama", note: "Shipped in the Discord bot" },
        { name: "discord.py", note: "Shipped in the Discord bot" },
      ],
    },
    {
      category: "Full-stack",
      items: [
        { name: "TypeScript", note: "Shipped in Vitae" },
        { name: "React", note: "Shipped in Vitae" },
        { name: "NextJS", note: "Shipped in Vitae" },
        { name: "PostgreSQL", note: "Shipped in Vitae" },
        { name: "Clerk", note: "Shipped in Vitae" },
      ],
    },
    {
      category: "Systems & delivery",
      items: [
        { name: "Docker", note: "Shipped in Vitae" },
        { name: "AWS", note: "Shipped in the Discord bot" },
        { name: "Vitest", note: "This site's test suite" },
        { name: "Git", note: "Daily driver" },
      ],
    },
    {
      category: "Foundations",
      items: [
        { name: "Data Structures", note: "Tutored DSA at UC Santa Cruz" },
        { name: "Algorithms", note: "Tutored DSA at UC Santa Cruz" },
      ],
    },
  ],
  contact: {
    heading: "Let’s connect.",
    message: "If you are hiring software engineers, I want to hear from you.",
    links: profileLinks,
  },
} as const satisfies PortfolioContent;
