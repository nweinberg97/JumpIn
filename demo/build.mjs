/**
 * Builds the static demo into demo/dist (deployed to GitHub Pages by
 * .github/workflows/demo.yml).   npm run demo:build
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const out = join(here, "dist");
const esbuild = await import(process.env.ESBUILD_MODULE ?? "esbuild");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await esbuild.build({
  entryPoints: { app: join(here, "entry.tsx") },
  outdir: out,
  bundle: true,
  minify: true,
  sourcemap: false,
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: (process.env.NODE_PATH ?? "").split(":").filter(Boolean),
  alias: {
    "@": join(root, "src"),
    "next/link": join(here, "shims/next-link.tsx"),
    "next/navigation": join(here, "shims/next-navigation.ts"),
    "next/font/google": join(here, "shims/next-font.ts"),
    "server-only": join(here, "shims/server-only.ts"),
  },
  logLevel: "warning",
});

cpSync(join(here, "index.html"), join(out, "index.html"));
console.log("Demo built →", out);
