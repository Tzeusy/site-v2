export type ProductivityCategory = {
  id: string;
  label: string;
};

export const productivityCategories: ProductivityCategory[] = [
  { id: "hardware", label: "Hardware" },
  { id: "software", label: "Software" },
  { id: "homelab", label: "Homelab" },
  { id: "smart home", label: "Smart Home" },
  { id: "terminal", label: "Terminal" },
  { id: "ide", label: "IDE" },
  { id: "programming", label: "Programming" },
  { id: "agents", label: "Agents" },
  { id: "linux", label: "Linux" },
  { id: "windows", label: "Windows" },
  { id: "learnings", label: "Learnings" },
  { id: "sre", label: "SRE" },
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
