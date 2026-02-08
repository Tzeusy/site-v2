import { withBasePath } from "@/lib/base-path";

export type ProjectLink = {
  label: string;
  href?: string;
};

export type ProjectThumbnail = {
  src: string;
  alt: string;
};

export type ProjectEntry = {
  title: string;
  description: string;
  blogSlug: string;
  thumbnail: ProjectThumbnail;
  links: ProjectLink[];
};

export const projects: ProjectEntry[] = [
  {
    title: "OpenAI Car Racing",
    description:
      "Imitation learning for the OpenAI Gym car racing environment, with Layerwise Relevance Propagation to visualize model behavior.",
    blogSlug: "openai-car-racing-adventures",
    thumbnail: {
      src: "/blog/openai-car-racing-adventures/thumbnail.jpg",
      alt: "OpenAI car racing visualization thumbnail",
    },
    links: [
      { label: "GitHub", href: "https://github.com/Tzeusy/RL_car" },
      { label: "Best Project Award" },
    ],
  },
  {
    title: "Automated Barista",
    description:
      "Automating a Niryo One 6-axis robotic arm and coffee machine via ROS and microcontroller integrations for SUTD Open House 2020.",
    blogSlug: "project-jessica",
    thumbnail: {
      src: "/blog/project-jessica/thumbnail.jpg",
      alt: "Automated Barista robotic arm thumbnail",
    },
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
    blogSlug: "ethereum-address-analyzer",
    thumbnail: {
      src: "/blog/ethereum-address-analyzer/thumbnail.jpg",
      alt: "Ethereum Activity Analyzer thumbnail",
    },
    links: [{ label: "Case study" }],
  },
  {
    title: "i3 Ricing",
    description:
      "A practical write-up on i3 tiling window manager customization for cleaner workflows and a more focused desktop environment.",
    blogSlug: "setting-up-of-i3wm-ricing",
    thumbnail: {
      src: "/blog/setting-up-of-i3wm-ricing/thumbnail.jpg",
      alt: "i3 desktop customization thumbnail",
    },
    links: [{ label: "Write-up" }],
  },
  {
    title: "Handwaving Magicka",
    description:
      "Computer vision and emulated game controllers for casting spells in Magicka using hand gestures.",
    blogSlug: "handwaving-magicka",
    thumbnail: {
      src: "/images/magicka.gif",
      alt: "Handwaving Magicka gesture-based spell casting",
    },
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
    blogSlug: "badminton-court-bot",
    thumbnail: {
      src: "/images/badminton.jpg",
      alt: "Badminton Court Bot court availability checker",
    },
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
    blogSlug: "sutd-mit-global-leadership-programme",
    thumbnail: {
      src: "/images/mit.jpg",
      alt: "SUTD-MIT Global Leadership Programme electric boat on the Charles River",
    },
    links: [{ label: "Most Technically Challenging Boat" }],
  },
  {
    title: "Binary Sudoku",
    description:
      "8x8 Binary Sudoku implemented on a Mojo FPGA with programmable WS2812b LED hardware.",
    blogSlug: "binary-sudoku",
    thumbnail: {
      src: "/images/binary-sudoku.jpg",
      alt: "Binary Sudoku on FPGA with WS2812b LEDs",
    },
    links: [{ label: "GitHub", href: "https://github.com/gabrielwong159/fpga" }],
  },
  {
    title: "Myx: Food Ordering",
    description:
      "Vue-based food delivery platform with customer and merchant interfaces, including merchant analytics workflows.",
    blogSlug: "myx-food-ordering",
    thumbnail: {
      src: "/images/myx.jpg",
      alt: "Myx food ordering platform",
    },
    links: [{ label: "Project" }],
  },
].map((project) => ({
  ...project,
  thumbnail: {
    ...project.thumbnail,
    src: withBasePath(project.thumbnail.src),
  },
}));
