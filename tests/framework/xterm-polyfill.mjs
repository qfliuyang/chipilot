/**
 * XTerm Polyfill Module
 *
 * This MUST be imported before any module that uses xterm-headless.
 * Import this module FIRST in any test file that needs xterm functionality.
 *
 * @example
 *   import "./xterm-polyfill.mjs";  // MUST be first!
 *   import { something } from "../../dist/index.js";
 */

// Apply polyfill synchronously at module load time
// This must run BEFORE any imports that could trigger xterm code
if (typeof globalThis.window === "undefined") {
  globalThis.window = {};
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: (tagName) => {
      if (tagName === "canvas") {
        return {
          getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            getImageData: () => ({ data: [] }),
            putImageData: () => {},
            createImageData: () => ({ data: [] }),
            setTransform: () => {},
            drawImage: () => {},
            save: () => {},
            fillText: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            stroke: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            arc: () => {},
            fill: () => {},
            measureText: () => ({ width: 0 }),
            transform: () => {},
            rect: () => {},
            clip: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createPattern: () => ({}),
            globalCompositeOperation: "source-over"
          }),
          width: 0,
          height: 0,
          style: {}
        };
      }
      return {};
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

// Mark that polyfill has been applied
globalThis.__xtermPolyfillApplied = true;
