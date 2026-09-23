import "dotenv/config";
import { createApp } from "@/server/server";
import { env } from "@/config/env";
import { ensurePortAvailable, reportPortInUse } from "@/server/ensure-port-available";
import { loadEmbeddingModel } from "@/modules/embeddings";

// The port is checked first: the model load can take minutes on a cold cache, and a busy
// port should fail at once, not after it.
await ensurePortAvailable(env.PORT);

console.log("loading embedding model…");
await loadEmbeddingModel();
console.log("embedding model ready");

const server = createApp().listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") reportPortInUse(env.PORT);
  throw err;
});
