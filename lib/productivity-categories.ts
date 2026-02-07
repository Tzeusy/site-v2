export type ProductivityCategory = {
  id: string;
  label: string;
  description: string;
};

export const productivityCategories: ProductivityCategory[] = [
  { id: "hardware", label: "Hardware", description: "Physical devices, peripherals, and ergonomics that shape my daily workflow." },
  { id: "software", label: "Software", description: "Desktop applications, utilities, and tools I rely on across machines." },
  { id: "homelab", label: "Homelab", description: "Self-hosted infrastructure, servers, and networking experiments at home." },
  { id: "smart home", label: "Smart Home", description: "Home automation, IoT devices, and the integrations that tie them together." },
  { id: "terminal", label: "Terminal", description: "Shell configuration, CLI tools, and terminal multiplexer setups." },
  { id: "ide", label: "IDE", description: "Editor configuration, extensions, and code navigation workflows." },
  { id: "programming", label: "Programming", description: "Languages, frameworks, and development patterns I work with." },
  { id: "agents", label: "Agents", description: "AI coding agents, LLM tooling, and prompt-driven development workflows." },
  { id: "linux", label: "Linux", description: "Linux distributions, desktop environments, and system-level configuration." },
  { id: "windows", label: "Windows", description: "Windows environment, WSL, and cross-platform development setups." },
  { id: "learnings", label: "Learnings", description: "Thoughts and learnings from various blogs, books, and resources on the internet." },
  { id: "sre", label: "SRE", description: "Site reliability practices, observability, incident response, and operational tooling." },
  { id: "cicd", label: "CI/CD", description: "Continuous integration and deployment pipelines, build systems, and release workflows." },
  { id: "health", label: "Health", description: "Fitness routines, ergonomics, and habits that support sustained productivity." },
];

export function normalizeProductivityKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, " ");
}

export const productivityCategoryKeyMap = new Map(
  productivityCategories.map((category) => [
    normalizeProductivityKey(category.id),
    category,
  ]),
);
