import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "@/server/server";
import type { Classifier } from "@/modules/relevance";

export const startServer = async (
  deps: { classifier?: Classifier | null } = {},
): Promise<{ server: Server; base: string }> => {
  const server = createApp(deps).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://localhost:${port}` };
};

export const stopServer = (server: Server): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

export const json = (base: string, path: string, init?: RequestInit) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
