export const identity = {
  name: "Berat Ercevik",
  role: "Software Engineer",
  tagline: "Full-stack applications · Agentic systems · AI research",
  location: "Santa Cruz, CA",
  bio: "I build full-stack applications, develop agentic systems, and conduct AI research. Completing my B.S. in Computer Science at UC Santa Cruz.",
  github: "https://github.com/bercev",
  linkedin: "https://linkedin.com/in/berat-ercevik",
  vitae: "https://vitae.tools",
} as const;

export const education = {
  school: "University of California, Santa Cruz",
  degree: "B.S. Computer Science",
  gpa: "4.0/4.0",
  period: "Sep 2024 – Dec 2026",
  coursework: [
    "DSA",
    "AI",
    "ML",
    "Computer Architecture",
    "Compiler Design",
    "Computer Systems Design",
    "Software Engineering",
  ],
} as const;

export type Role = {
  title: string;
  company: string;
  tags: string[];
  period: string;
  bullets: string[];
};

export const experience: Role[] = [
  {
    title: "AI Systems Engineer Intern",
    company: "Stealth Startup",
    tags: ["Python", "Google ADK", "GCP", "Docker"],
    period: "Apr 2026 – Present",
    bullets: [
      "Building a multi-agent system that creates software using multimodal and source-based evidence.",
      "Designing specialized agent workflows with structured handoffs, persistent execution state, and inspectable artifacts.",
      "Developed a Ralph-style discovery loop for the understanding pipeline — iterative evidence collection, specialist review, and quality gates that reject unsupported claims.",
      "Integrated a Claude Code-based agentic coding harness into a sandboxed execution environment with schema validation, automated build + replay checks, deterministic quality gates, and iterative repair.",
    ],
  },
  {
    title: "DSA Tutor",
    company: "Student Support, UCSC",
    tags: ["Collaboration", "Communication"],
    period: "Apr 2025 – Present",
    bullets: [
      "Tutored 100+ upper-division students per quarter across office hours and project support.",
      "Partnered with faculty and TAs to keep grading consistent.",
    ],
  },
  {
    title: "LLM Researcher",
    company: "Algoverse",
    tags: ["LLMs", "Python", "Hydra", "Tmux", "Runpod", "SQLite"],
    period: "Jun 2025 – Jan 2026",
    bullets: [
      "Created and analyzed a 1M+ tweet dataset of Grok conversations for LLM–user interaction research.",
      "Fine-tuned a BERT topic model on conversation-level embeddings to extract value-laden topics.",
      "Built a high-throughput scraping pipeline using SQLite WAL for concurrent ingestion.",
      "A verbose logging/debugging system cut API calls and compute costs by 50%.",
    ],
  },
  {
    title: "SWE Intern",
    company: "Trustd.ai",
    tags: ["React", "NextJS", "TypeScript", "MongoDB", "AWS", "Git", "SCRUM"],
    period: "Oct 2024 – Feb 2025",
    bullets: [
      "Built an admin dashboard and REST-backed MongoDB workflows for thousands of user records (CRUD, Zod validation, error handling).",
      "Managed AWS Amplify CI/CD and grew Playwright + Jest coverage by 60%, catching pre-release regressions.",
    ],
  },
];

export type Project = {
  name: string;
  blurb: string;
  tags: string[];
  period: string;
  link?: string;
  linkLabel?: string;
  highlights: string[];
};

export const projects: Project[] = [
  {
    name: "Vitae",
    blurb: "Resume-building + version-control platform. Built with an Agile/Scrum team of 5.",
    tags: ["NextJS", "TypeScript", "Jest", "PostgreSQL", "Docker", "CI/CD", "Neon", "Clerk", "SCRUM"],
    period: "Jan 2026 – Jun 2026",
    link: "https://vitae.tools",
    linkLabel: "vitae.tools",
    highlights: [
      "PostgreSQL via Docker (local) and Neon (production); optimized queries cut average response latency by 30%.",
      "Clerk auth; GitHub Actions + Netlify CI/CD with Jest and strict type/style checks — 70% fewer merge conflicts, 99.9% production uptime.",
    ],
  },
  {
    name: "AI Discord Chatbot",
    blurb: "Llama 3-powered Discord assistant with multi-agent RAG and self-correction.",
    tags: ["Python", "discord.py", "Ollama", "AWS", "LangChain", "SQL"],
    period: "Aug 2024 – Sep 2024",
    highlights: ["10K+ indexed messages; served 50+ community members."],
  },
];

export type Publication = { title: string; venue: string };

export const publications: Publication[] = [
  {
    title: "SkillOptimizer: Agent Skill Optimization Through Subskills Without Task Supervision",
    venue: "ICML 2026 AIWILD Workshop",
  },
  {
    title: "GrokSet: Multi-party Human–LLM Interactions in Social Media",
    venue: "arXiv:2602.21236, Feb 2026",
  },
];

export const skills = {
  Languages: ["Python", "JavaScript", "TypeScript", "C/C++", "PostgreSQL", "NoSQL"],
  Frameworks: ["React", "NextJS", "Express", "React Native", "Expo", "Jest", "LangChain", "Ollama"],
  Tools: ["Linux", "Git", "AWS", "Tmux", "Hydra", "Runpod", "Netlify", "Playwright"],
  Knowledge: [
    "OOP",
    "DSA",
    "AI",
    "ML",
    "LLMs",
    "Multi-agent systems",
    "RAG",
    "REST APIs",
    "Concurrency & Parallelism",
    "Agile SCRUM",
  ],
} as const;
