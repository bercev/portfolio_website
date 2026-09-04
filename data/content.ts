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
  readonly title: string;
  readonly venue: string;
  readonly date: string;
  readonly href: string;
  readonly pdfUrl: string;
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

export interface Project {
  readonly title: string;
  readonly dates: string;
  readonly description: string;
  readonly technologies: readonly string[];
  readonly href?: string;
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
    readonly items: readonly string[];
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
      "AI systems engineer — multi-agent products and published LLM research",
    bio: "I build agentic software systems and study how LLMs behave in the wild. Currently an AI Systems Engineer Intern building multi-agent pipelines, with SkillOptimizer (ICML 2026 AIWILD Workshop) and @GrokSet (arXiv), while finishing CS at UC Santa Cruz (4.0).",
  },
  about: {
    bio: [
      "I started coding in seventh grade because I liked making things that actually did something. In high school that grew into CS classes, AP CS, and a hackathon where my team took third. Building with other people clicked for me there, and I wanted more of it.",
      "After high school I built an AI Discord chatbot for a real community. I was obsessed with it. People actually used it, asked it things, and leaned on it in the server, and watching that land taught me how much it means when software reaches someone outside your own laptop.",
      "Then I interned at Trustd.ai before college. That was my first real look at professional software. I worked with a mentor, sat in code review, took feedback that made my work sharper, and watched how production systems are designed, tested, and kept alive. A lot of how I think about shipping came from that room.",
      "When I started at UC Santa Cruz, my curiosity pulled hard toward AI and agents. Through Algoverse I researched how people talk to LLMs in the wild and helped build @GrokSet. I also worked on SkillOptimizer for the ICML 2026 AIWILD Workshop, digging into how agents can get better at skills without heavy task supervision. Alongside that I tutored DSA for upper division students, which forced me to explain hard ideas clearly under real time pressure.",
      "In my software engineering course I joined four teammates on Vitae. We lived in Scrum for months. Timing slipped, tickets collided, and we spent long sessions tracing bugs that only appeared when two features met. We brainstormed until messy ideas became something we could ship, leaned on each other through the rough weeks, and formed the kind of trust you get from solving hard problems together. That project still sits close to me.",
      "Now I am an AI Systems Engineer Intern building multi-agent pipelines that turn evidence into software, and I build every day with tools like Codex and Claude. The through line is pretty simple: start curious, put something in front of real people, learn how teams ship, study how agents behave, then build the systems I wanted to exist.",
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
      title:
        "SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision.",
      venue: "ICML 2026 AIWILD Workshop",
      date: "2026",
      href: "https://openreview.net/forum?id=nZYF0aPAMP",
      pdfUrl: "/assets/publications/skilloptimizer.pdf",
      preview: {
        src: "/assets/publications/skilloptimizer.png",
        alt: "First-page preview of the SkillOptimizer paper.",
        width: 817,
        height: 867,
        isPlaceholder: false,
      },
    },
    {
      title: "@GrokSet: Multi-party Human-LLM Interactions in Social Media.",
      venue: "arXiv:2602.21236",
      date: "February 2026",
      href: "https://arxiv.org/abs/2602.21236",
      pdfUrl: "/assets/publications/grokset.pdf",
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
      dates: "Apr 2026-Present",
      summary:
        "Building a multi-agent system that creates software from multimodal, source-based evidence — structured handoffs, persistent execution state, inspectable artifacts, iterative discovery, and sandboxed build-and-repair until acceptance checks pass.",
      technologies: ["Python", "Google ADK", "GCP", "Docker"],
    },
    {
      role: "DSA Tutor",
      dates: "Apr 2025-Present",
      summary:
        "I support upper-division students through office hours and project guidance, explaining data structures, algorithmic tradeoffs, and debugging strategies while collaborating with faculty and teaching assistants on consistent evaluation.",
      technologies: ["Data Structures", "Algorithms"],
    },
    {
      role: "LLM Researcher",
      organization: "Algoverse",
      dates: "Jun 2025-Jan 2026",
      summary:
        "Built and analyzed @GrokSet (1M+ tweets of public Grok conversations), fine-tuned BERTopic on conversation-level embeddings, and ran concurrent collection/debug workflows that cut API and compute cost ~50%.",
      technologies: ["LLMs", "Python", "Hydra", "Tmux", "Runpod", "SQLite"],
    },
    {
      role: "SWE Intern",
      organization: "Trustd.ai",
      dates: "Oct 2024-Feb 2025",
      summary:
        "Shipped admin + REST MongoDB workflows for large user-record sets with Zod validation, then hardened Amplify CI/CD and expanded Playwright/Jest coverage (~60%).",
      technologies: ["React", "NextJS", "TypeScript", "MongoDB", "AWS", "Git", "SCRUM"],
    },
  ],
  projects: [
    {
      title: "Vitae",
      dates: "Jan 2026-Jun 2026",
      description:
        "Resume building and version-control platform shipped with a 5-person Agile team — Postgres (Docker/Neon), Clerk auth, GitHub Actions + Netlify CI/CD; ~30% faster API responses, ~70% fewer merge conflicts, 99.9% uptime.",
      technologies: [
        "NextJS",
        "TypeScript",
        "Jest",
        "PostgreSQL",
        "Docker",
        "CI/CD",
        "Neon",
        "Clerk",
        "SCRUM",
      ],
      href: "https://vitae.tools/",
    },
    {
      title: "AI Discord Chatbot",
      dates: "Aug 2024-Sep 2024",
      description:
        "Llama 3 Discord assistant with multi-agent RAG and self-correction (10K+ indexed messages, 50+ community members).",
      technologies: ["Python", "discord.py", "Ollama", "AWS", "LangChain", "SQL"],
      href: "https://github.com/bercev/Discord-Chatbot-AI",
    },
  ],
  skills: [
    {
      category: "AI & agents",
      items: [
        "Python",
        "LLMs",
        "Multi-agent systems",
        "RAG",
        "LangChain",
        "Ollama",
        "Google ADK",
        "discord.py",
        "Hydra",
        "Tmux",
        "Runpod",
      ],
    },
    {
      category: "Full-stack",
      items: [
        "TypeScript",
        "React",
        "NextJS",
        "PostgreSQL",
        "MongoDB",
        "SQLite",
        "SQL",
        "Express",
        "Clerk",
        "Neon",
        "Zod",
      ],
    },
    {
      category: "Systems & delivery",
      items: [
        "Docker",
        "GCP",
        "AWS",
        "CI/CD",
        "Jest",
        "Playwright",
        "Linux",
        "Git",
        "SCRUM",
      ],
    },
    {
      category: "Foundations",
      items: ["Data Structures", "Algorithms"],
    },
  ],
  contact: {
    heading: "Let’s talk AI systems.",
    message: "Open to AI systems / ML engineering roles — full-stack craft included.",
    links: profileLinks,
  },
} as const satisfies PortfolioContent;
