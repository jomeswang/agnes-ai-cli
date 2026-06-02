import type { AgnesClientConfig, AgnesStatus, NormalizedVideoResult } from "../config.js";
import { resolveConfig } from "../config.js";
import { AgnesCliError } from "../errors.js";
import { requestJson } from "../http/requestJson.js";
import { extractTaskId, normalizeStatus } from "./generateVideo.js";

export interface PollVideoOptions {
  intervalSeconds?: number;
  timeoutSeconds?: number;
}

export async function pollVideo(
  taskId: string,
  options: PollVideoOptions = {},
  config: AgnesClientConfig = {},
): Promise<NormalizedVideoResult> {
  const resolved = resolveConfig(config);
  if (!resolved.apiKey) {
    throw new AgnesCliError("AUTH_MISSING", "AGNES_API_KEY is required for Agnes requests.");
  }
  const intervalMs = (options.intervalSeconds ?? 3) * 1000;
  const timeoutMs = (options.timeoutSeconds ?? 600) * 1000;
  const started = Date.now();

  while (true) {
    if (Date.now() - started > timeoutMs) {
      throw new AgnesCliError("POLL_TIMEOUT", "Agnes video polling timed out.", { taskId, status: "timed_out" });
    }

    const { response, raw } = await requestJson(resolved.fetchImpl, `${resolved.baseUrl}/videos/${taskId}`, {
      headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
      },
    }, {
      networkMessage: "Agnes video poll request failed before a response was received.",
    });
    if (response.status === 404) {
      throw new AgnesCliError("TASK_NOT_FOUND", "Agnes video task was not found.", { taskId, status: "failed", raw });
    }
    if (response.status === 503) {
      throw new AgnesCliError("SERVICE_BUSY", "Agnes video service is busy.", { taskId, status: "queued", raw });
    }
    if (!response.ok) {
      throw new AgnesCliError("AGNES_REQUEST_FAILED", `Agnes video poll failed with HTTP ${response.status}.`, { taskId, status: "failed", raw });
    }

    const result = normalizeVideoResult(raw);
    if (result.status === "completed") return result;
    if (result.status === "failed") {
      throw new AgnesCliError("TASK_FAILED", "Agnes video task failed.", result);
    }
    await sleep(intervalMs);
  }
}

export function normalizeVideoResult(raw: unknown): NormalizedVideoResult {
  if (!raw || typeof raw !== "object") {
    throw new AgnesCliError("INVALID_RESPONSE", "Agnes video poll response was not an object.", raw);
  }
  const record = raw as Record<string, unknown>;
  const taskId = extractTaskId(record);
  const rawStatus = typeof record.status === "string" ? record.status : "queued";
  const status = normalizeStatus(rawStatus);
  const videoUrl = extractVideoUrl(record);
  if (status === "completed" && !videoUrl) {
    throw new AgnesCliError("VIDEO_URL_MISSING", "Completed Agnes video task did not include a video URL.", raw);
  }
  return {
    ok: true,
    taskId,
    status: status as AgnesStatus,
    rawStatus,
    model: typeof record.model === "string" ? record.model : "agnes-video-v2.0",
    videoUrl: videoUrl ?? "",
    seconds: typeof record.seconds === "number" ? record.seconds : undefined,
    size: typeof record.size === "string" ? record.size : undefined,
    raw,
  };
}

function extractVideoUrl(record: Record<string, unknown>): string | undefined {
  const candidates: unknown[] = [
    record.video_url,
    record.url,
    record.output_url,
    record.remixed_from_video_id,
    typeof record.result === "object" && record.result ? (record.result as Record<string, unknown>).video_url : undefined,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https?:\/\//.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
