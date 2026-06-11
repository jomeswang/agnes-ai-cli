import { AgnesCliError } from "./errors.js";

export type Ttl = "1h" | "12h" | "24h" | "72h";

export type FetchLike = typeof fetch;

export interface AgnesClientConfig {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  defaultMediaTtl?: Ttl;
  mediaProvider?: MediaUrlProvider;
  env?: NodeJS.ProcessEnv;
}

export interface MediaUrlProvider {
  upload(localPath: string, options?: { ttl?: Ttl }): Promise<string>;
}

export interface ResolvedConfig {
  apiKey?: string;
  baseUrl: string;
  fetchImpl: FetchLike;
  defaultMediaTtl: Ttl;
  mediaProvider?: MediaUrlProvider;
  env: NodeJS.ProcessEnv;
}

export const DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1";
export const DEFAULT_MEDIA_TTL: Ttl = "1h";
export const DEFAULT_VIDEO_DIMENSIONS = {
  width: 1152,
  height: 768,
};
export const DEFAULT_VIDEO_TEMPORAL = {
  numFrames: 121,
  frameRate: 24,
};

export function resolveConfig(config: AgnesClientConfig = {}): ResolvedConfig {
  if (!config.fetchImpl && typeof fetch !== "function") {
    throw new AgnesCliError("FETCH_UNAVAILABLE", "Global fetch is unavailable in this Node runtime.");
  }
  return {
    apiKey: config.apiKey ?? config.env?.AGNES_API_KEY ?? process.env.AGNES_API_KEY,
    baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
    fetchImpl: config.fetchImpl ?? fetch,
    defaultMediaTtl: config.defaultMediaTtl ?? DEFAULT_MEDIA_TTL,
    mediaProvider: config.mediaProvider,
    env: config.env ?? process.env,
  };
}

export interface AuthCheckResult {
  ok: boolean;
  configured: boolean;
  source: "env" | "missing";
}

export interface PublicUrlResult {
  ok: true;
  url: string;
  source: "passthrough" | "litterbox" | "temporary" | "provider";
}

export type AgnesStatus = "queued" | "in_progress" | "completed" | "failed" | "timed_out";

export interface NormalizedVideoTask {
  ok: true;
  taskId: string;
  status: AgnesStatus;
  rawStatus?: string;
  model: string;
  raw: unknown;
}

export interface NormalizedVideoResult {
  ok: true;
  taskId: string;
  status: AgnesStatus;
  rawStatus?: string;
  model: string;
  videoUrl: string;
  seconds?: number;
  size?: string;
  raw: unknown;
}

export interface ImageGenerationResult {
  ok: true;
  model: string;
  url: string;
  raw: unknown;
}
