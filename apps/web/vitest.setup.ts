import "@testing-library/jest-dom/vitest";

/**
 * jsdom ships no ResizeObserver, and self-measuring components construct one on
 * mount. A no-op keeps every suite that merely renders them alive; suites that
 * assert on resizing install their own controllable double.
 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
