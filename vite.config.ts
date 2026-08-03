import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

/**
 * Native bundle slimming.
 *
 * Files under `public/` are copied verbatim into every build. The Capacitor
 * apps (residents / suppliers) must NOT ship web-only, marketing or dev
 * artifacts — and must not ship `sw.js` at all, since service workers are
 * disabled in native (see src/lib/registerSW.ts).
 *
 * The files stay in the repo (the website still needs them); they are only
 * pruned from dist-residents / dist-suppliers after the build.
 */
function stripNativeAssetsPlugin(appMode: string): Plugin {
  const isNativeBuild = appMode === "residents" || appMode === "suppliers";
  const PRUNE_DIRS = ["design-proposals"];
  const PRUNE_FILES = [
    "robots.txt",
    "sitemap.xml",
    "sw.js",
    "placeholder.svg",
    "og-image.jpg",
    // Only the *other* app's hero is dead weight; keep this app's own hero.
    appMode === "residents"
      ? "marketing/supplier-hero-bg.jpg"
      : "marketing/resident-hero-bg.jpg",
  ];

  let outDir = "dist";
  return {
    name: "strip-native-assets",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    closeBundle() {
      if (!isNativeBuild) return;
      const removed: string[] = [];
      for (const d of PRUNE_DIRS) {
        const p = path.resolve(outDir, d);
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
          removed.push(`${d}/`);
        }
      }
      for (const f of PRUNE_FILES) {
        const p = path.resolve(outDir, f);
        if (fs.existsSync(p)) {
          fs.rmSync(p, { force: true });
          removed.push(f);
        }
      }
      console.log(
        `[strip-native-assets] ${appMode}: pruned ${removed.length} entries → ${removed.join(", ") || "(none)"}`,
      );
    },
  };
}


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
  const emptyRoutes = path.resolve(__dirname, "./src/routes/EmptyRoutes.tsx");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), heroPreloadPlugin(appMode), stripNativeAssetsPlugin(appMode), mode === "development" && componentTagger()].filter(Boolean),
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
        // Build-time route exclusion: the excluded groups resolve to an empty
        // stub, so Admin code never reaches an iOS bundle and each app only
        // ships its own screens.
        ...(appMode === "residents" || appMode === "suppliers"
          ? { "@/routes/AdminRoutes": emptyRoutes }
          : {}),
        ...(appMode === "residents" ? { "@/routes/SupplierRoutes": emptyRoutes } : {}),
        ...(appMode === "suppliers" ? { "@/routes/ResidentRoutes": emptyRoutes } : {}),
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
