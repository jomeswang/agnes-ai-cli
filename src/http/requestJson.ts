import { AgnesCliError } from "../errors.js";

export async function requestJson(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  options: { retries?: number; retryDelayMs?: number; networkMessage?: string } = {},
): Promise<{ response: Response; raw: unknown }> {
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 500;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, init);
      const raw = await response.json();
      return { response, raw };
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw new AgnesCliError(
          "NETWORK_ERROR",
          options.networkMessage ?? "Network request failed.",
          { cause: error instanceof Error ? error.message : String(error) },
        );
      }
      await sleep(retryDelayMs);
    }
  }

  throw new AgnesCliError("NETWORK_ERROR", options.networkMessage ?? "Network request failed.", {
    cause: lastError instanceof Error ? lastError.message : String(lastError),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
