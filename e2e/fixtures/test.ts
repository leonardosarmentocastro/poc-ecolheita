import { test as base, expect } from "@playwright/test";
import { truncateAll } from "./db";

// Auto fixture: reset the shared e2e DB before each test (suite runs serially).
export const test = base.extend<{ freshDb: void }>({
  freshDb: [
    async ({}, use) => {
      await truncateAll();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
