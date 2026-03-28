import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/testing/MockDetectionEngine.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  dts: true,
  sourcemap: true,
  minify: false,
  external: [
    "node-pty",
    "@anthropic-ai/sdk",
    "openai",
    "@pinecone-database/pinecone",
    "@modelcontextprotocol/sdk",
    "ink",
    "ink-text-input",
    "ink-spinner",
    "chalk",
    "commander",
    "conf",
    "xterm-headless",
    "neo-blessed",
    "term.js",
    "pty.js",
    "blessed",
  ],
  noExternal: ["xterm-addon-serialize"],
  esbuildOptions(options) {
    options.banner = {
      js: "// @ts-check",
    };
  },
});
