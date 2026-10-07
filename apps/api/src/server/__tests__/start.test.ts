import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";

const apiDir = fileURLToPath(new URL("../../../", import.meta.url));

describe("booting the API on a port already in use", () => {
  let blocker: net.Server;
  let port: number;

  beforeAll(async () => {
    blocker = net.createServer().listen(0);
    await new Promise((resolve) => blocker.once("listening", resolve));
    port = (blocker.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((resolve) => blocker.close(() => resolve())));

  // The model load can take minutes on a cold cache; a busy port must not wait for it.
  it("exits with the port error before loading the embedding model", async () => {
    const { code, stdout, stderr } = await new Promise<{
      code: number | null;
      stdout: string;
      stderr: string;
    }>((resolve) => {
      execFile(
        "pnpm",
        ["exec", "tsx", "src/server/start.ts"],
        { cwd: apiDir, env: { ...process.env, PORT: String(port) }, timeout: 60_000 },
        (err, stdout, stderr) =>
          resolve({ code: err ? ((err.code as number | undefined) ?? null) : 0, stdout, stderr }),
      );
    });
    expect(stderr).toContain(`Port ${port} is already in use`);
    expect(code).toBe(1);
    expect(stdout).not.toContain("loading embedding model");
  });
});
