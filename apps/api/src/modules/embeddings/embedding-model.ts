import { fileURLToPath } from "node:url";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
export const EMBEDDING_DIMENSIONS = 384;

// apps/api/.models/ — visible, gitignored, cached by CI keyed on the model name.
env.cacheDir = fileURLToPath(new URL("../../../.models/", import.meta.url));

let extractor: FeatureExtractionPipeline | undefined;

/**
 * Loads the model once. Called by the server before it listens and by the test setup
 * before the first request. A model that cannot load (no cache and no network, corrupt
 * files) throws here, so the boot fails fast instead of serving 500s on the first call.
 */
export const loadEmbeddingModel = async (): Promise<void> => {
  if (extractor) return;
  extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
};

/** The vector of an already-normalised text. Callers normalise with `normalizeForEmbedding`. */
export const embed = async (text: string): Promise<number[]> => {
  if (!extractor) throw new Error("embedding model not loaded: call loadEmbeddingModel() at boot");
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
};
