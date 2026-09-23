import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||= "postgres://ecolheita:ecolheita@localhost:5432/ecolheita_test";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@test\//, replacement: fileURLToPath(new URL("./test/", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
  test: {
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false,
  },
});
