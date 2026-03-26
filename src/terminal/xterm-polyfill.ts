// Polyfill for xterm-headless which references `window` without checking
// This must be imported before any xterm packages

if (typeof globalThis.window === "undefined") {
  // @ts-expect-error: window is not defined in Node.js, but xterm-headless needs it
  globalThis.window = {};
}

if (typeof globalThis.document === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = {
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}
