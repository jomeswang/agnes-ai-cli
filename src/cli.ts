import { Command } from "commander";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { saveKeyToShell } from "./auth/saveKey.js";
import { createAgnesClient } from "./index.js";
import { isAgnesCliError } from "./errors.js";
import { printJson, printLines } from "./output.js";

export async function runCli(argv = process.argv): Promise<void> {
  const program = new Command();
  program
    .name("agnes")
    .description("CLI for Agnes AI text, image, and video workflows, with auth and media URL bridging")
    .version("0.1.0")
    .addHelpText("after", `
Examples:
  agnes auth check
  agnes media url ./input.png
  agnes image img2img --image ./input.png --prompt "Turn this into an editorial campaign"
  agnes video keyframes --image ./a.png --image ./b.png --prompt "Transition between these frames"

Use this CLI when you want explicit Agnes request-shape handling, local-file URL bridging, or stable JSON output for agents.
`);

  const client = createAgnesClient();

  const auth = program.command("auth").description("Inspect and configure Agnes auth");
  auth.addHelpText("after", `
Examples:
  agnes auth check
  agnes auth save-key --key sk-...

Use this group to verify AGNES_API_KEY or persist it into the active shell rc file.
`);
  auth
    .command("check")
    .description("Check whether AGNES_API_KEY is configured")
    .option("--json", "Output JSON")
    .action((options) => {
      const result = client.auth.check();
      if (options.json) {
        printJson(result);
        return;
      }
      printLines([
        result.configured ? "AGNES_API_KEY is configured." : "AGNES_API_KEY is missing.",
        `source: ${result.source}`,
      ]);
    });
  auth
    .command("save-key")
    .description("Persist AGNES_API_KEY into the current shell rc file")
    .requiredOption("--key <value>", "Agnes API key to persist")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const result = await saveKeyToShell(options.key);
      if (options.json) {
        printJson(result);
        return;
      }
      printLines([
        "AGNES_API_KEY saved.",
        `rc file: ${result.rcFile}`,
      ]);
    });

  const media = program.command("media").description("Resolve Agnes media inputs");
  media.addHelpText("after", `
Examples:
  agnes media url ./frame.png
  agnes media url https://example.com/frame.png

Use this group when Agnes requires a public image URL and your source asset is a local file path.
`);
  media
    .command("url")
    .description("Return a public URL for a local file or pass through an existing URL")
    .argument("<file-or-url>", "Local file path or http(s) URL")
    .option("--ttl <ttl>", "Temporary upload TTL (1h, 12h, 24h, 72h)", "1h")
    .option("--json", "Output JSON")
    .action(async (input, options) => {
      const result = await client.media.toPublicUrl(input, { ttl: ttlSchema.parse(options.ttl) });
      if (options.json) {
        printJson(result);
        return;
      }
      console.log(result.url);
    });

  const text = program.command("text").description("Run Agnes text workflows");
  text.addHelpText("after", `
Examples:
  agnes text chat --prompt "Reply with exactly pong."

Use this group for Agnes chat/completions request shapes when you want a minimal one-shot text call through the CLI.
`);
  text
    .command("chat")
    .description("Run a one-shot Agnes chat completion")
    .requiredOption("--prompt <text>", "Prompt text")
    .option("--model <model>", "Agnes text model", "agnes-2.0-flash")
    .option("--json", "Output JSON")
    .addHelpText("after", `
Example:
  agnes text chat --prompt "Reply with exactly pong."

Request shape:
  Sends a single-user-message Agnes /chat/completions request with agnes-2.0-flash by default.
`)
    .action(async (options) => {
      const result = await client.text.complete({
        prompt: options.prompt,
        model: options.model,
      });
      if (options.json) {
        printJson(result);
        return;
      }
      console.log(result.text);
    });

  const image = program.command("image").description("Generate Agnes images");
  image.addHelpText("after", `
Examples:
  agnes image text2img --prompt "A luminous city at sunrise"
  agnes image img2img --image ./input.png --prompt "Restyle this frame for a premium campaign"
  agnes image compose --image ./a.png --image ./b.png --prompt "Blend these references"

Use this group for /images/generations request shapes. text2img sends prompt-only payloads. img2img sends a single image URL. compose sends an image URL array.
`);
  image
    .command("text2img")
    .description("Generate an image from text")
    .requiredOption("--prompt <text>", "Prompt text")
    .option("--model <model>", "Agnes image model")
    .option("--size <size>", "Image size, e.g. 1024x768")
    .option("--seed <number>", "Seed", parseInteger)
    .option("--json", "Output JSON")
    .addHelpText("after", `
Example:
  agnes image text2img --prompt "A luminous city at sunrise" --size 1024x1024

Request shape:
  Sends prompt-only generation to Agnes /images/generations with agnes-image-2.1-flash by default.
`)
    .action(async (options) => {
      const result = await client.image.generate({
        mode: "text2img",
        prompt: options.prompt,
        model: options.model,
        size: options.size,
        seed: options.seed,
      });
      if (options.json) {
        printJson(result);
        return;
      }
      console.log(result.url);
    });
  image
    .command("img2img")
    .description("Generate an image from one input image")
    .requiredOption("--image <path-or-url>", "Input image path or URL")
    .requiredOption("--prompt <text>", "Prompt text")
    .option("--model <model>", "Agnes image model")
    .option("--size <size>", "Image size, e.g. 1024x768")
    .option("--seed <number>", "Seed", parseInteger)
    .option("--ttl <ttl>", "Temporary upload TTL", "1h")
    .option("--json", "Output JSON")
    .addHelpText("after", `
Example:
  agnes image img2img --image ./input.png --prompt "Turn this into an editorial travel poster"

Request shape:
  Resolves the local file to a public URL when needed, then sends a single Agnes image URL for image-to-image generation.
`)
    .action(async (options) => {
      const result = await client.image.generate({
        mode: "img2img",
        image: options.image,
        prompt: options.prompt,
        model: options.model,
        size: options.size,
        seed: options.seed,
        ttl: ttlSchema.parse(options.ttl),
      });
      if (options.json) {
        printJson(result);
        return;
      }
      console.log(result.url);
    });
  image
    .command("compose")
    .description("Generate an image from multiple input images")
    .requiredOption("--image <path-or-url...>", "Repeatable image path or URL")
    .requiredOption("--prompt <text>", "Prompt text")
    .option("--model <model>", "Agnes image model")
    .option("--size <size>", "Image size, e.g. 1024x768")
    .option("--seed <number>", "Seed", parseInteger)
    .option("--ttl <ttl>", "Temporary upload TTL", "1h")
    .option("--json", "Output JSON")
    .addHelpText("after", `
Example:
  agnes image compose --image ./a.png --image ./b.png --prompt "Blend these references into one campaign frame"

Request shape:
  Resolves each input to a public URL, preserves image order, and sends an Agnes image URL array for multi-image composition.
`)
    .action(async (options) => {
      const images = toArray(options.image);
      const result = await client.image.generate({
        mode: "compose",
        images,
        prompt: options.prompt,
        model: options.model,
        size: options.size,
        seed: options.seed,
        ttl: ttlSchema.parse(options.ttl),
      });
      if (options.json) {
        printJson(result);
        return;
      }
      console.log(result.url);
    });

  const video = program.command("video").description("Generate Agnes videos");
  video.addHelpText("after", `
Examples:
  agnes video text2video --prompt "A cinematic beach scene at sunset"
  agnes video img2video --image ./frame.png --prompt "Add gentle wind and a soft push-in"
  agnes video keyframes --image ./a.png --image ./b.png --prompt "Transition between the frames"
  agnes video poll task_123

Use this group for Agnes video task creation and polling. Video creation is asynchronous; poll returns the final result.
`);
  buildVideoGenerateCommand(video, "text2video", "Generate a video from text", async (client, options) =>
    client.video.generate({
      mode: "text2video",
      prompt: options.prompt,
      width: options.width,
      height: options.height,
      numFrames: options.numFrames,
      frameRate: options.frameRate,
      seed: options.seed,
      negativePrompt: options.negativePrompt,
    }),
  );
  buildVideoGenerateCommand(video, "img2video", "Generate a video from one input image", async (client, options) =>
    client.video.generate({
      mode: "img2video",
      image: Array.isArray(options.image) ? options.image[0] : options.image,
      prompt: options.prompt,
      width: options.width,
      height: options.height,
      numFrames: options.numFrames,
      frameRate: options.frameRate,
      seed: options.seed,
      negativePrompt: options.negativePrompt,
      ttl: ttlSchema.parse(options.ttl),
    }),
    "single",
  );
  buildVideoGenerateCommand(video, "multivideo", "Generate a video from multiple input images", async (client, options) =>
    client.video.generate({
      mode: "multivideo",
      images: toArray(options.image),
      prompt: options.prompt,
      width: options.width,
      height: options.height,
      numFrames: options.numFrames,
      frameRate: options.frameRate,
      seed: options.seed,
      negativePrompt: options.negativePrompt,
      ttl: ttlSchema.parse(options.ttl),
    }),
    "multi",
  );
  buildVideoGenerateCommand(video, "keyframes", "Generate a keyframe video from multiple images", async (client, options) =>
    client.video.generate({
      mode: "keyframes",
      images: toArray(options.image),
      prompt: options.prompt,
      width: options.width,
      height: options.height,
      numFrames: options.numFrames,
      frameRate: options.frameRate,
      seed: options.seed,
      negativePrompt: options.negativePrompt,
      ttl: ttlSchema.parse(options.ttl),
    }),
    "multi",
  );
  video
    .command("poll")
    .description("Poll an Agnes video task until it finishes")
    .argument("<task-id>", "Task id returned by Agnes video creation")
    .option("--interval <seconds>", "Polling interval seconds", parseInteger, 3)
    .option("--timeout <seconds>", "Polling timeout seconds", parseInteger, 600)
    .option("--json", "Output JSON")
    .addHelpText("after", `
Example:
  agnes video poll task_123 --interval 3 --timeout 600

Request shape:
  Polls Agnes /videos/{task_id} until the task completes, fails, or times out. Use this after any asynchronous video creation command.
`)
    .action(async (taskId, options) => {
      const result = await client.video.poll(taskId, {
        intervalSeconds: options.interval,
        timeoutSeconds: options.timeout,
      });
      if (options.json) {
        printJson(result);
        return;
      }
      printLines([
        result.videoUrl,
        `status: ${result.status}`,
        result.seconds !== undefined ? `seconds: ${result.seconds}` : undefined,
        result.size ? `size: ${result.size}` : undefined,
      ]);
    });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    handleCliError(error, argv);
  }
}

function buildVideoGenerateCommand(
  video: Command,
  name: string,
  description: string,
  fn: (client: ReturnType<typeof createAgnesClient>, options: any) => Promise<unknown>,
  imageMode: false | "single" | "multi" = false,
): void {
  let command = video
    .command(name)
    .description(description)
    .requiredOption("--prompt <text>", "Prompt text")
    .option("--width <number>", "Video width", parseInteger)
    .option("--height <number>", "Video height", parseInteger)
    .option("--num-frames <number>", "Video frame count, must satisfy 8n + 1", parseInteger)
    .option("--frame-rate <number>", "Frame rate (1-60)", parseInteger)
    .option("--seed <number>", "Seed", parseInteger)
    .option("--negative-prompt <text>", "Negative prompt")
    .option("--json", "Output JSON");
  if (imageMode === "single") {
    command = command
      .requiredOption("--image <path-or-url>", "Input image path or URL")
      .option("--ttl <ttl>", "Temporary upload TTL", "1h");
  } else if (imageMode === "multi") {
    command = command
      .requiredOption("--image <path-or-url...>", "Repeatable image path or URL")
      .option("--ttl <ttl>", "Temporary upload TTL", "1h");
  }
  command.addHelpText("after", buildVideoHelp(name, imageMode));
  command.action(async (options) => {
    const client = createAgnesClient();
    const result = await fn(client, options);
    if (options.json) {
      printJson(result);
      return;
    }
    const task = result as { taskId: string; status: string };
    printLines([
      `taskId: ${task.taskId}`,
      `status: ${task.status}`,
    ]);
  });
}

function handleCliError(error: unknown, argv: string[]): never {
  const wantsJson = argv.includes("--json");
  if (isAgnesCliError(error)) {
    if (wantsJson) {
      printJson({
        ok: false,
        code: error.code,
        message: error.message,
        ...toJsonDetails(error.details),
      });
      process.exit(error.exitCode);
    }
    console.error(error.message);
    process.exit(error.exitCode);
  }
  if (error instanceof z.ZodError) {
    if (wantsJson) {
      printJson({
        ok: false,
        code: "INVALID_ARGUMENTS",
        message: error.issues.map((issue) => issue.message).join("\n"),
      });
      process.exit(1);
    }
    console.error(error.issues.map((issue) => issue.message).join("\n"));
    process.exit(1);
  }
  if (wantsJson) {
    printJson({
      ok: false,
      code: "UNEXPECTED_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseInteger(value: string): number {
  return Number.parseInt(value, 10);
}

function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

const ttlSchema = z.enum(["1h", "12h", "24h", "72h"]);

function toJsonDetails(details: unknown): Record<string, unknown> {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }
  return details as Record<string, unknown>;
}

function buildVideoHelp(name: string, imageMode: false | "single" | "multi"): string {
  const examples: Record<string, string> = {
    text2video: 'agnes video text2video --prompt "A cinematic beach scene at sunset"',
    img2video: 'agnes video img2video --image ./frame.png --prompt "Add gentle wind and a soft push-in"',
    multivideo: 'agnes video multivideo --image ./a.png --image ./b.png --prompt "Blend these references into one motion concept"',
    keyframes: 'agnes video keyframes --image ./a.png --image ./b.png --prompt "Transition between these frames"',
  };
  const shapeNotes: Record<string, string> = {
    text2video: "Sends a prompt-only Agnes video task payload.",
    img2video: "Resolves the input file to a public URL when needed, then sends a single top-level image field.",
    multivideo: "Resolves each input to a public URL and sends an ordered Agnes image URL array in extra_body.image.",
    keyframes: "Uses Agnes keyframes mode. Pass --image at least twice; each image keeps its original order and is sent in extra_body.image with extra_body.mode=keyframes.",
  };
  const imageNote =
    imageMode === "multi"
      ? "Required image input: repeat --image two or more times."
      : imageMode === "single"
        ? "Required image input: provide exactly one --image."
        : "No image input is required for this mode.";
  return `
Example:
  ${examples[name] ?? `agnes video ${name} --help`}

Request shape:
  ${shapeNotes[name] ?? "Creates an Agnes video task."}
  ${imageNote}
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void runCli(process.argv);
}
