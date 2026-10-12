import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import rehypeEditorial from "./src/lib/rehype-editorial.mjs";

export default defineConfig({
  site: "https://shubham.gg",
  base: "/",
  trailingSlash: "ignore",
  integrations: [mdx(), sitemap({ customPages: ["https://shubham.gg/chandni-bros/"] })],
  markdown: {
    rehypePlugins: [rehypeEditorial],
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
});
