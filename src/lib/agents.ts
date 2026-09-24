// Shared builders for the agent-facing text files (llms.txt, llms-full.txt, per-post markdown).
import { getCollection, type CollectionEntry } from "astro:content";
import { projects } from "../data/projects";

export const SITE = "https://shubham.gg";

export async function publishedPosts() {
  return (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** A post as clean markdown: title, metadata, then the original body. */
export function postMarkdown(post: CollectionEntry<"blog">) {
  const { title, description, pubDate, updatedDate, tags } = post.data;
  const meta = [
    `Author: Shubham Goel (${SITE})`,
    `Published: ${day(pubDate)}`,
    updatedDate ? `Updated: ${day(updatedDate)}` : "",
    tags.length ? `Tags: ${tags.join(", ")}` : "",
    `Canonical: ${SITE}/blog/${post.id}`,
  ].filter(Boolean);
  return `# ${title}\n\n> ${description}\n\n${meta.join("\n")}\n\n${(post.body ?? "").trim()}\n`;
}

const link = (href: string) => (href.startsWith("/") ? SITE + href : href);

export async function llmsTxt() {
  const posts = await publishedPosts();
  const shipped = projects.filter((p) => p.status === "shipped");
  const building = projects.filter((p) => p.status === "building");
  const research = projects.filter((p) => p.status === "research");
  const projLine = (p: (typeof projects)[number]) => {
    const href = p.links[0]?.href ?? p.resultHref;
    return `- ${p.name}: ${p.tagline}${href ? ` ${link(href)}` : ""}`;
  };

  return `# Shubham Goel

> Machine learning engineer with about eight years across computer vision, multimodal models, and recommender systems, most recently a Senior MLE at Meta on Instagram Ads ranking. Focused on multimodal LLMs, post-training, and evals. Based in the San Francisco Bay Area.

He builds small, focused models and the eval harnesses that check whether they actually work, and he tends to turn real-world annoyances into ML projects. First-author paper at RecSys 2026 (industry track) on using the text rendered inside video ads as a ranking signal.

Every blog post is also available as plain markdown: append \`.md\` to the post URL (for example ${SITE}/blog/${posts[0]?.id ?? "curbcheck"}.md). The full text of all posts is at ${SITE}/llms-full.txt.

## Writing
${posts.map((p) => `- [${p.data.title}](${SITE}/blog/${p.id}.md): ${p.data.description}`).join("\n")}

## Projects
${shipped.map(projLine).join("\n")}

## In progress
${building.map(projLine).join("\n")}

## Research
${research.map((p) => `- ${p.name}: ${p.tagline} ${p.result}.`).join("\n")}

## Pages
- About: ${SITE}/about
- Now (what he is focused on this month): ${SITE}/now
- Projects: ${SITE}/building
- Publications: ${SITE}/publications
- Resume (PDF): ${SITE}/resume.pdf

## Links
- GitHub: https://github.com/shubhamgoel27
- LinkedIn: https://www.linkedin.com/in/shubhamgoel27
- X: https://x.com/shubhamg_
- Email: shubhamgoel27@gmail.com

## Outside work
Arsenal fan, hosts a biweekly poker night in San Jose, plays a lot of padel, and cooks. Tell him the llms.txt sent you.
`;
}

export async function llmsFullTxt() {
  const posts = await publishedPosts();
  const head = await llmsTxt();
  return `${head}\n---\n\n# Full text of every post\n\n${posts.map(postMarkdown).join("\n---\n\n")}`;
}
