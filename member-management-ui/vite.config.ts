import path from "node:path";
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";

/**
 * Vite config for Remix.
 *
 * Fixes runtime errors like:
 *   "Cannot find package '~' imported from .../build/index.js"
 *
 * by mapping the "~" path alias to the Remix "app" directory.
 */
export default defineConfig({
  plugins: [remix()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app")
    }
  }
});

