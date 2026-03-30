// Test script to isolate the window error

// Apply polyfill synchronously at module load time
if (typeof globalThis.window === "undefined") {
  globalThis.window = {};
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: (tagName) => {
      if (tagName === "canvas") {
        return {
          getContext: () => ({
            fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
            putImageData: () => {}, createImageData: () => ({ data: [] }), setTransform: () => {},
            drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
            beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
            stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
            arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }), transform: () => {},
            rect: () => {}, clip: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }), createPattern: () => ({}),
            globalCompositeOperation: "source-over"
          }), width: 0, height: 0, style: {}
        };
      }
      return {};
    },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => []
  };
}

console.log("Polyfill applied - window:", typeof globalThis.window, "document:", typeof globalThis.document);

try {
  console.log("Importing dist/index.js...");
  const result = await import("../../dist/index.js");
  console.log("Import successful!");
  console.log("Exports:", Object.keys(result));
} catch (err) {
  console.error("Import failed:", err.message);
  console.error("Stack:", err.stack);
}
