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
  href: "/resume.pdf",
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
    tagline: "I build software that reasons, adapts, and ships.",
    bio: "I’m a software engineer building full-stack applications, developing agentic systems, and conducting AI research while studying Computer Science at UC Santa Cruz.",
  },
  about: {
    bio: [
      "I work across a range of programming languages, frameworks, and computer science fundamentals.",
      "My practical experience spans full-stack applications, agentic systems, and AI research.",
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
      preview: {
        src: "/publications/skilloptimizer.png",
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
      preview: {
        src: "/publications/grokset.png",
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
        "I build a multi-agent system that creates software from multimodal, source-based evidence, with structured handoffs, persistent execution state, inspectable artifacts, iterative discovery, and sandboxed build-and-repair checks.",
      technologies: ["Python", "Google ADK", "GCP", "Docker"],
    },
    {
      role: "DSA Tutor",
      dates: "Apr 2025-Present",
      summary:
        "I support upper-division students through office hours and project guidance, explaining data structures, algorithmic tradeoffs, and debugging strategies while collaborating with faculty and teaching assistants on consistent evaluation.",
      technologies: [
        "Student Support",
        "Collaboration",
        "Communication",
      ],
    },
    {
      role: "LLM Researcher",
      organization: "Algoverse",
      dates: "Jun 2025-Jan 2026",
      summary:
        "I research human-LLM interactions through social-media conversation data, fine-tune BERTopic on conversation-level embeddings, and build concurrent collection and debugging workflows for analysis.",
      technologies: [
        "LLMs",
        "Python",
        "Hydra",
        "Tmux",
        "Runpod",
        "SQLite",
      ],
    },
    {
      role: "SWE Intern",
      organization: "Trustd.ai",
      dates: "Oct 2024-Feb 2025",
      summary:
        "I built administrative and REST-backed MongoDB workflows for user-record management, added Zod validation and error handling, and strengthened CI/CD and automated test coverage.",
      technologies: [
        "React",
        "NextJS",
        "TypeScript",
        "MongoDB",
        "AWS",
        "Git",
        "SCRUM",
      ],
    },
  ],
  projects: [
    {
      title: "Vitae",
      dates: "Jan 2026-Jun 2026",
      description:
        "I developed a resume-building and version-control platform with a collaborative Agile/Scrum team, focusing on PostgreSQL persistence, authentication, CI/CD, testing, and reliable delivery.",
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
        "I built a Discord assistant with multi-agent retrieval-augmented generation and self-correction, backed by persistent message storage and deployed tooling.",
      technologies: [
        "Python",
        "discord.py",
        "Ollama",
        "AWS",
        "LangChain",
        "SQL",
      ],
    },
  ],
  skills: [
    {
      category: "Languages",
      items: [
        "Python",
        "JavaScript",
        "TypeScript",
        "C/C++",
        "PostgreSQL",
        "NoSQL",
      ],
    },
    {
      category: "Tools",
      items: [
        "Linux",
        "Git",
        "AWS",
        "Tmux",
        "Hydra",
        "Runpod",
        "Netlify",
        "Playwright",
      ],
    },
    {
      category: "Frameworks",
      items: [
        "React",
        "NextJS",
        "Express",
        "React Native",
        "Expo",
        "Jest",
        "LangChain",
        "Ollama",
      ],
    },
    {
      category: "Knowledge",
      items: [
        "OOP",
        "Data Structures and Algorithms",
        "Artificial Intelligence",
        "Machine Learning",
        "Large Language Models",
        "Multi-agent systems",
        "RAG",
        "RESTful APIs",
        "Concurrency & Parallelism",
        "Agile SCRUM Methodology",
      ],
    },
  ],
  contact: {
    heading: "Let’s connect.",
    message: "Explore my work, professional history, and resume.",
    links: profileLinks,
  },
} as const satisfies PortfolioContent;
