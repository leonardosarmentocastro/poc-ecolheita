import "dotenv/config";
import { createApp } from "@/server/server";
import { env } from "@/config/env";
import { ensurePortAvailable, reportPortInUse } from "@/server/ensure-port-available";
import { loadEmbeddingModel } from "@/modules/embeddings";
import { classifierFromEnv } from "@/modules/relevance/classifier-from-env";

// The port is checked first: the model load can take minutes on a cold cache, and a busy
// port should fail at once, not after it.
await ensurePortAvailable(env.PORT);

console.log("loading embedding model…");
await loadEmbeddingModel();
console.log("embedding model ready");

const server = createApp({ classifier: classifierFromEnv(env) }).listen(env.PORT, () => {
  console.log(`api listening on http://localhost:${env.PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") reportPortInUse(env.PORT);
  throw err;
});
