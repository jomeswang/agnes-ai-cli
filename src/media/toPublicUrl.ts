import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { LitterboxMediaUrlProvider } from "./litterbox.js";
import type { AgnesClientConfig, PublicUrlResult, Ttl } from "../config.js";
import { resolveConfig } from "../config.js";
import { AgnesCliError } from "../errors.js";

export async function toPublicUrl(
  input: string,
  options: { ttl?: Ttl } = {},
  config: AgnesClientConfig = {},
): Promise<PublicUrlResult> {
  if (/^https?:\/\//.test(input)) {
    return { ok: true, url: input, source: "passthrough" };
  }

  try {
    await access(input, constants.R_OK);
  } catch {
    throw new AgnesCliError("INPUT_NOT_FOUND", `Input must be an existing file path or an http(s) URL: ${input}`);
  }

  const resolved = resolveConfig(config);
  const provider =
    resolved.mediaProvider ??
    new LitterboxMediaUrlProvider(resolved.fetchImpl);
  const url = await provider.upload(input, { ttl: options.ttl ?? resolved.defaultMediaTtl });
  return { ok: true, url, source: resolved.mediaProvider ? "provider" : "litterbox" };
}
