import { defineConfig } from "vite-plus";
import { lint, fmt } from "@saeris/configs";
import manifest from "./package.json" with { type: "json" };

export default defineConfig({
  lint,
  fmt,
  // ── Tasks (Vite Task) ───────────────────────────────────────────────
  run: {
    tasks: {
      build: { command: "vp pack", cache: true },
      dev: { command: "vp pack --watch", cache: false },
      bench: {
        command:
          "vp pack && deoptkit ci bench/validate.bench.mjs bench/convert.bench.mjs",
        cache: false
      }
    }
  },
  // ── Builds (tsdown) ─────────────────────────────────────────────────
  pack: {
    entry: { index: "src/index.ts", valimock: "src/valimock.ts" },
    clean: true,
    format: [`esm`],
    dts: true,
    outDir: `./dist`
  },
  // ── Testing (Vitest) ────────────────────────────────────────────────
  test: {
    name: manifest.name,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    passWithNoTests: true
  }
});
