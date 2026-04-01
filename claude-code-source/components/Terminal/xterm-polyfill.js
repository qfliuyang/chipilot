// Polyfill for xterm-headless which requires browser globals
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
