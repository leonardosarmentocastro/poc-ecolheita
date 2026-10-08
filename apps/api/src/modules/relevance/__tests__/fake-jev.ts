import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";

// The fake echoes whatever JSON the adapter sent; tests read into it freely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Seen = { headers: IncomingHttpHeaders; body: any };
type Reply = { status?: number; body?: unknown; raw?: string; delayMs?: number };

/** A local stand-in for TypeSafe's endpoint (spec § Testing, Jev adapter). */
export const startFakeJev = async (handler: (req: Seen) => Reply) => {
  const requests: Seen[] = [];
  const server = createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      const seen = { headers: req.headers, body: data ? JSON.parse(data) : undefined };
      requests.push(seen);
      const reply = handler(seen);
      setTimeout(() => {
        if (res.destroyed) return;
        res.writeHead(reply.status ?? 200, { "content-type": "application/json" });
        res.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
      }, reply.delayMs ?? 0);
    });
  });
  server.listen(0);
  await new Promise((r) => server.once("listening", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://localhost:${port}/v1/systemone`,
    requests,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
};

/** A well-formed answer giving each question the tier the callback picks. */
export const answering = (pick: (instructions: string) => string) => (req: Seen) => ({
  body: {
    model: "jev-1.13.0",
    answers: Object.fromEntries(
      Object.entries(req.body.questions as Record<string, { instructions: string }>).map(
        ([id, q]) => [
          id,
          { type: "choice", choice: pick(q.instructions), confidence: 0.9, probabilities: {} },
        ],
      ),
    ),
    usage: { input_tokens: 1, output_tokens: 0 },
  },
});
