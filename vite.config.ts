import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function heroPreloadPlugin(appMode: string) {
  return {
    name: "hero-preload",
    transformIndexHtml(html: string) {
      const mode = appMode.toLowerCase();
      const images =
        mode === "suppliers"
          ? ["/marketing/supplier-hero-bg.jpg"]
          : mode === "residents"
            ? ["/marketing/resident-hero-bg.jpg"]
            : ["/marketing/resident-hero-bg.jpg", "/marketing/supplier-hero-bg.jpg"];

      const tags = images
        .map(
          (href, i) =>
            `<link rel="preload" as="image" href="${href}"${i === 0 ? ' fetchpriority="high"' : ""} />`,
        )
        .join("\n    ");
      return html.replace("</head>", `    ${tags}\n  </head>`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appMode = (env.VITE_APP_MODE || "").toLowerCase();

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), heroPreloadPlugin(appMode), mode === "development" && componentTagger()].filter(Boolean),
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query", "@tanstack/query-core"],
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-ui": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "lucide-react",
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
