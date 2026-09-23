import path from "node:path";
import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const alias = { "@": path.resolve(dirname, "./src") };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        resolve: { alias },
        optimizeDeps: {
          include: [
            "storybook/test",
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/notifications",
            "@tabler/icons-react",
            "zod",
            "react-hook-form",
            "@hookform/resolvers/zod",
            "@tanstack/react-query",
          ],
        },
        test: {
          name: "storybook",
          setupFiles: ["./.storybook/vitest.setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
