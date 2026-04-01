import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cli.ts",
  ],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  dts: true,
  sourcemap: true,
  minify: false,
  external: [
    "node-pty",
    "ink",
    "ink-text-input",
    "react",
  ],
  noExternal: ["xterm-headless", "xterm-addon-serialize"],
  esbuildOptions(options) {
    options.banner = {
      js: `
// Polyfill for xterm-headless browser globals
if (typeof globalThis.window === "undefined") {
  globalThis.window = {};
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
        putImageData: () => {}, createImageData: () => ({ data: [] }), setTransform: () => {},
        drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
        stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
        arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }), transform: () => {},
        rect: () => {}, clip: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }), createPattern: () => ({}),
        globalCompositeOperation: "source-over",
      }),
      width: 0, height: 0, style: {},
    }),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  };
}
`,
    };
  },
});
