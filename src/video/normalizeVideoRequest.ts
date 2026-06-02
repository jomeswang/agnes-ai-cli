import { z } from "zod";
import { DEFAULT_VIDEO_DIMENSIONS, DEFAULT_VIDEO_TEMPORAL, type Ttl } from "../config.js";
import { AgnesCliError } from "../errors.js";

const shared = {
  prompt: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  numFrames: z.number().int().positive().optional(),
  frameRate: z.number().int().positive().optional(),
  seed: z.number().int().optional(),
  negativePrompt: z.string().min(1).optional(),
};

export const videoGenerateSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("text2video"), ...shared }),
  z.object({ mode: z.literal("img2video"), image: z.string().min(1), ttl: z.enum(["1h", "12h", "24h", "72h"]).optional(), ...shared }),
  z.object({ mode: z.literal("multivideo"), images: z.array(z.string().min(1)).min(2), ttl: z.enum(["1h", "12h", "24h", "72h"]).optional(), ...shared }),
  z.object({ mode: z.literal("keyframes"), images: z.array(z.string().min(1)).min(2), ttl: z.enum(["1h", "12h", "24h", "72h"]).optional(), ...shared }),
]);

export type VideoGenerateOptions = z.infer<typeof videoGenerateSchema>;

export function collectVideoInputs(options: VideoGenerateOptions): { inputs: string[]; ttl?: Ttl } {
  switch (options.mode) {
    case "text2video":
      return { inputs: [] };
    case "img2video":
      return { inputs: [options.image], ttl: options.ttl };
    case "multivideo":
    case "keyframes":
      return { inputs: options.images, ttl: options.ttl };
    default:
      throw new AgnesCliError("INVALID_VIDEO_MODE", "Unsupported video generation mode.");
  }
}

export function normalizeVideoRequest(
  options: VideoGenerateOptions,
  resolvedImages: string[],
): Record<string, unknown> {
  const width = options.width ?? DEFAULT_VIDEO_DIMENSIONS.width;
  const height = options.height ?? DEFAULT_VIDEO_DIMENSIONS.height;
  const numFrames = options.numFrames ?? DEFAULT_VIDEO_TEMPORAL.numFrames;
  const frameRate = options.frameRate ?? DEFAULT_VIDEO_TEMPORAL.frameRate;
  validateVideoSettings({ numFrames, frameRate, mode: options.mode, imageCount: resolvedImages.length });

  const payload: Record<string, unknown> = {
    model: "agnes-video-v2.0",
    prompt: options.prompt,
    width,
    height,
    num_frames: numFrames,
    frame_rate: frameRate,
  };
  if (options.seed !== undefined) payload.seed = options.seed;
  if (options.negativePrompt) payload.negative_prompt = options.negativePrompt;

  switch (options.mode) {
    case "text2video":
      break;
    case "img2video":
      payload.image = resolvedImages[0];
      break;
    case "multivideo":
      payload.extra_body = { image: resolvedImages };
      break;
    case "keyframes":
      payload.extra_body = { image: resolvedImages, mode: "keyframes" };
      break;
    default:
      throw new AgnesCliError("INVALID_VIDEO_MODE", "Unsupported video generation mode.");
  }

  return payload;
}

export function validateVideoSettings({
  numFrames,
  frameRate,
  mode,
  imageCount,
}: {
  numFrames: number;
  frameRate: number;
  mode: VideoGenerateOptions["mode"];
  imageCount: number;
}): void {
  if (numFrames > 441) {
    throw new AgnesCliError("INVALID_VIDEO_SETTINGS", "numFrames must be <= 441.");
  }
  if ((numFrames - 1) % 8 !== 0) {
    throw new AgnesCliError("INVALID_VIDEO_SETTINGS", "numFrames must satisfy 8n + 1.");
  }
  if (frameRate < 1 || frameRate > 60) {
    throw new AgnesCliError("INVALID_VIDEO_SETTINGS", "frameRate must be between 1 and 60.");
  }
  if (mode === "img2video" && imageCount !== 1) {
    throw new AgnesCliError("INVALID_VIDEO_SETTINGS", "img2video requires exactly one image.");
  }
  if ((mode === "multivideo" || mode === "keyframes") && imageCount < 2) {
    throw new AgnesCliError("INVALID_VIDEO_SETTINGS", `${mode} requires at least two images.`);
  }
}
