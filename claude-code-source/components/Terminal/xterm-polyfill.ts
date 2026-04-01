// Polyfill for xterm-headless and xterm-addon-serialize which reference browser globals
// This must be imported before any xterm packages

if (typeof globalThis.window === "undefined") {
  // @ts-expect-error: window is not defined in Node.js, but xterm-headless needs it
  globalThis.window = {};
}

if (typeof globalThis.document === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).document = {
    createElement: (tagName: string) => {
      if (tagName === "canvas") {
        // Return a canvas mock with getContext for xterm-addon-serialize
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
            createLinearGradient: () => ({
              addColorStop: () => {},
            }),
            createRadialGradient: () => ({
              addColorStop: () => {},
            }),
            createPattern: () => ({}),
            globalCompositeOperation: "source-over",
          }),
          width: 0,
          height: 0,
          style: {},
        };
      }
      return {};
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}
