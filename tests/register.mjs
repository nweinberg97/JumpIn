// Lets Node's built-in test runner load the app's TypeScript directly, with
// no build step and no extra packages:
//   * extensionless relative imports ("./time") resolve to .ts files
//   * "@/..." resolves to src/... (the tsconfig path alias)
//   * "server-only" becomes an empty module (it guards bundles, not tests)
import { register } from "node:module";

const hooks = `
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const src = new URL("../src/", ${JSON.stringify(import.meta.url)});

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
  let target = specifier;
  if (specifier.startsWith("@/")) target = new URL(specifier.slice(2), src).href;
  else if (specifier.startsWith(".") && context.parentURL) target = new URL(specifier, context.parentURL).href;
  else return next(specifier, context);
  for (const ext of ["", ".ts", ".tsx", "/index.ts"]) {
    const candidate = target + ext;
    if (candidate.startsWith("file:") && existsSync(fileURLToPath(candidate)) && !candidate.endsWith("/")) {
      if (ext || /\\.[cm]?[jt]sx?$/.test(candidate)) return { url: candidate, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hooks)}`, import.meta.url);
