import { z } from "zod";
import type { Ttl } from "../config.js";
import { AgnesCliError } from "../errors.js";

export const imageGenerateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("text2img"),
    model: z.enum(["agnes-image-2.1-flash", "agnes-image-2.0-flash"]).optional(),
    prompt: z.string().min(1),
    size: z.string().optional(),
    responseFormat: z.literal("url").optional(),
    seed: z.number().int().optional(),
  }),
  z.object({
    mode: z.literal("img2img"),
    model: z.enum(["agnes-image-2.1-flash", "agnes-image-2.0-flash"]).optional(),
    image: z.string().min(1),
    prompt: z.string().min(1),
    size: z.string().optional(),
    responseFormat: z.literal("url").optional(),
    seed: z.number().int().optional(),
    ttl: z.enum(["1h", "12h", "24h", "72h"]).optional(),
  }),
  z.object({
    mode: z.literal("compose"),
    model: z.enum(["agnes-image-2.1-flash", "agnes-image-2.0-flash"]).optional(),
    images: z.array(z.string().min(1)).min(2),
    prompt: z.string().min(1),
    size: z.string().optional(),
    responseFormat: z.literal("url").optional(),
    seed: z.number().int().optional(),
    ttl: z.enum(["1h", "12h", "24h", "72h"]).optional(),
  }),
]);

export type ImageGenerateOptions = z.infer<typeof imageGenerateSchema>;

export function normalizeImageRequest(
  options: ImageGenerateOptions,
  resolvedImages: string[],
): Record<string, unknown> {
  const model = options.model ?? "agnes-image-2.1-flash";
  const payload: Record<string, unknown> = {
    model,
    prompt: options.prompt,
  };

  if (options.size) payload.size = options.size;
  if (options.seed !== undefined) payload.seed = options.seed;

  if (options.mode === "text2img") {
    return payload;
  }

  const imageValue = options.mode === "img2img" ? resolvedImages[0] : resolvedImages;
  payload.extra_body = {
    image: imageValue,
    ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
  };
  if (model === "agnes-image-2.0-flash") {
    payload.tags = ["img2img"];
  }
  return payload;
}

export function collectImageInputs(options: ImageGenerateOptions): { inputs: string[]; ttl?: Ttl } {
  switch (options.mode) {
    case "text2img":
      return { inputs: [] };
    case "img2img":
      return { inputs: [options.image], ttl: options.ttl };
    case "compose":
      return { inputs: options.images, ttl: options.ttl };
    default:
      throw new AgnesCliError("INVALID_IMAGE_MODE", "Unsupported image generation mode.");
  }
}
