export type ProjectLink = {
  label: string;
  href?: string;
};

export type ProjectEntry = {
  title: string;
  description: string;
  links: ProjectLink[];
};

export const projects: ProjectEntry[] = [
  {
    title: "OpenAI Car Racing",
    description:
      "Imitation learning for the OpenAI Gym car racing environment, with Layerwise Relevance Propagation to visualize model behavior.",
    links: [
      { label: "GitHub", href: "https://github.com/Tzeusy/RL_car" },
      { label: "Best Project Award" },
    ],
  },
  {
    title: "Automated Barista",
    description:
      "Automating a Niryo One 6-axis robotic arm and coffee machine via ROS and microcontroller integrations for SUTD Open House 2020.",
    links: [
      {
        label: "Video",
        href: "https://www.facebook.com/niryorobotics/videos/621264878315431/",
      },
      { label: "Outstanding Contribution to Pillar" },
    ],
  },
  {
    title: "Ethereum Activity Analyzer",
    description:
      "Automated Ethereum address analysis for MAS compliance checks, behavior monitoring, and related address discovery.",
    links: [{ label: "Case study" }],
  },
  {
    title: "i3 Ricing",
    description:
      "A practical write-up on i3 tiling window manager customization for cleaner workflows and a more focused desktop environment.",
    links: [{ label: "Write-up" }],
  },
  {
    title: "Handwaving Magicka",
    description:
      "Computer vision and emulated game controllers for casting spells in Magicka using hand gestures.",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/Yustynn/magicka2-real-spellcasting",
      },
    ],
  },
  {
    title: "Badminton Court Bot",
    description:
      "Telegram bot that checks OnePA.sg court availability in one pass to remove manual slot-by-slot checking.",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/Tzeusy/badminton_court_bot",
      },
    ],
  },
  {
    title: "SUTD-MIT Global Leadership Programme",
    description:
      "Ten-week exchange building an electric boat to sail the Charles River in Boston.",
    links: [{ label: "Most Technically Challenging Boat" }],
  },
  {
    title: "Binary Sudoku",
    description:
      "8x8 Binary Sudoku implemented on a Mojo FPGA with programmable WS2812b LED hardware.",
    links: [{ label: "GitHub", href: "https://github.com/gabrielwong159/fpga" }],
  },
  {
    title: "Myx: Food Ordering",
    description:
      "Vue-based food delivery platform with customer and merchant interfaces, including merchant analytics workflows.",
    links: [{ label: "Project" }],
  },
];
