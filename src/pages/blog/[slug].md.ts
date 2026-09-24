import type { APIRoute, GetStaticPaths } from "astro";
import { publishedPosts, postMarkdown } from "../../lib/agents";

export const getStaticPaths: GetStaticPaths = async () =>
  (await publishedPosts()).map((post) => ({ params: { slug: post.id }, props: { post } }));

export const GET: APIRoute = ({ props }) =>
  new Response(postMarkdown((props as any).post), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
