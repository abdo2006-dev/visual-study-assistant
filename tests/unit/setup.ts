import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Without test.globals enabled, @testing-library/react's own auto-cleanup
// detection (which looks for a global `afterEach`) never fires, so render()
// calls would otherwise accumulate across tests in the same file.
afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
