import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://shubham.gg",
  base: "/",
  trailingSlash: "ignore",
  integrations: [sitemap({ customPages: ["https://shubham.gg/chandni-bros/"] })],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      wrap: true,
    },
  },
});
