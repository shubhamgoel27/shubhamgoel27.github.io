import type { ImageMetadata } from "astro";

import artifoldImg from "../assets/projects/artifold.png";
import rlArcadeImg from "../assets/projects/rl-arcade.png";
import auraFcImg from "../assets/projects/aura-fc.png";
import chandniImg from "../assets/projects/chandni-chowk-bros.png";
import tavernImg from "../assets/projects/tavern-nights.png";
import graphQuestImg from "../assets/projects/graph-quest.png";
import mleInterviewImg from "../assets/projects/mle-interview.png";

export type ProjectStatus = "shipped" | "building" | "research";

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  name: string;
  tagline: string;       // one line: what it is
  result: string;        // the concrete outcome / metric
  resultHref?: string;   // makes the result line a link
  tags: string[];        // tech
  links: ProjectLink[];  // empty => "repo coming soon"
  status: ProjectStatus;
  featured?: boolean;    // surfaced on the home page
  image?: ImageMetadata; // screenshot for the card
}

export const projects: Project[] = [
  // ---------- Shipped ----------
  {
    name: "artifold",
    tagline: "A local-first library for the stuff you make with AI. Index, search, preview, and share your work, then use your past output as the style guide for the next thing you build.",
    result: "Published on PyPI, pip-installable",
    tags: ["Python", "CLI", "embeddings", "semantic search"],
    links: [
      { label: "GitHub", href: "https://github.com/shubhamgoel27/artifold" },
      { label: "PyPI", href: "https://pypi.org/project/artifold/" },
    ],
    status: "shipped",
    featured: true,
    image: artifoldImg,
  },
  {
    name: "rl-arcade",
    tagline: "A gamified app that teaches reinforcement learning across six levels of PufferLib games, with interactive in-browser training, concept visualizations, and an XP system.",
    result: "6 playable levels, train models live in the browser",
    tags: ["Streamlit", "RL", "PufferLib"],
    links: [{ label: "GitHub", href: "https://github.com/shubhamgoel27/rl-arcade" }],
    status: "shipped",
    featured: true,
    image: rlArcadeImg,
  },
  {
    name: "Chandni Chowk Bros",
    tagline: "An endless runner set in Old Delhi: dodge rickshaws, outsmart monkeys, grab samosas, and make it to the Red Fort. Playable on desktop and mobile.",
    result: "Live at chandni-chowk-bros.com",
    resultHref: "https://chandni-chowk-bros.com/",
    tags: ["JavaScript", "game", "canvas"],
    links: [
      { label: "Play", href: "https://chandni-chowk-bros.com/" },
      { label: "GitHub", href: "https://github.com/shubhamgoel27/chandni-chowk-bros" },
    ],
    status: "shipped",
    featured: true,
    image: chandniImg,
  },
  {
    name: "Tavern Tactics",
    tagline: "Poker meets Gwent in a medieval tavern: build poker hands across two rows, manage a 10-card budget, and outlast the house across a best-of-3 match.",
    result: "Single-player strategy card game, playable in the browser",
    tags: ["TypeScript", "game", "strategy"],
    links: [{ label: "GitHub", href: "https://github.com/shubhamgoel27/tavern-nights" }],
    status: "shipped",
    image: tavernImg,
  },
  // ---------- Building ----------
  {
    name: "MLE Interview 2.0",
    tagline: "An interactive prep portal covering all nine rounds of the modern ML engineer interview: in-browser Python coding exercises via Pyodide, quizzes, and SM-2 spaced-repetition flashcards.",
    result: "9 rounds, 46 topics, 16 coding exercises, 35 flashcards",
    tags: ["Next.js", "Pyodide", "spaced repetition"],
    links: [],
    status: "building",
    image: mleInterviewImg,
  },
  {
    name: "AURA FC",
    tagline: "A real-time pipeline that turns soccer footage into live AI commentary. YOLOv8 detection and tracking feed an event layer, which drives generated play-by-play overlays.",
    result: "SAHI slicing 2x'd ball recall; camera-motion compensation halved false sprints",
    tags: ["YOLOv8", "SAHI", "computer vision", "LLM", "TTS"],
    links: [{ label: "GitHub", href: "https://github.com/shubhamgoel27/soccer-co-commentator" }],
    status: "building",
    image: auraFcImg,
  },
  {
    name: "visionbench",
    tagline: "A growing set of from-scratch ML coding challenges for vision models, VLMs, and VLAs. The kind of problems worth keeping sharp on.",
    result: "Spans convolution, IoU, patch embeddings, VAE reparameterization, and more",
    tags: ["PyTorch", "VLMs", "VLAs", "evals"],
    links: [{ label: "GitHub", href: "https://github.com/shubhamgoel27/visionbench" }],
    status: "building",
  },
  {
    name: "graph quest",
    tagline: "Learn graph theory and combinatorics through interactive, gamified lessons: modules from fundamentals to BFS/DFS, with XP, levels, and a graph playground on the way.",
    result: "Interactive lessons with a node-and-edge visualizer",
    tags: ["Next.js", "Cytoscape", "education"],
    links: [{ label: "GitHub", href: "https://github.com/shubhamgoel27/graph-quest" }],
    status: "building",
    image: graphQuestImg,
  },

  // ---------- Research ----------
  {
    name: "The Text on the Creative",
    tagline: "First-author paper on an under-exploited ranking modality for short-form video ads: the text rendered on the creative itself.",
    result: "RecSys '26 Industry Track, under review",
    tags: ["multimodal", "ranking", "OCR"],
    links: [],
    status: "research",
  },
  {
    name: "Hurricane Damage Estimation",
    tagline: "Property-damage prediction from pre- and post-disaster satellite imagery paired with insurance data, using a Siamese change-detection network.",
    result: "0.804 IoU, invited talk at GeoPython 2020",
    tags: ["satellite imagery", "Siamese networks", "change detection"],
    links: [],
    status: "research",
  },
  {
    name: "Building Detection in Dense Regions",
    tagline: "Co-authored work at Reliance Jio on extracting building footprints at scale to automate population estimation for the JioFiber rollout.",
    result: "Reverse Mask R-CNN lifted mIoU from 75% to 84.3%",
    tags: ["Mask R-CNN", "remote sensing", "segmentation"],
    links: [],
    status: "research",
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
