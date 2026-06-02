import { basename, extname } from "node:path";
import { promises as fs } from "node:fs";
import type { FetchLike, Ttl } from "../config.js";
import { AgnesCliError } from "../errors.js";

const LITTERBOX_ENDPOINT = "https://litterbox.catbox.moe/resources/internals/api.php";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

export class LitterboxMediaUrlProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async upload(localPath: string, options: { ttl?: Ttl } = {}): Promise<string> {
    const ttl = options.ttl ?? "1h";
    const file = await fs.readFile(localPath);
    const form = new FormData();
    const mimeType = MIME_TYPES[extname(localPath).toLowerCase()] ?? "application/octet-stream";
    const blob = new Blob([file], { type: mimeType });
    form.set("reqtype", "fileupload");
    form.set("time", ttl);
    form.set("fileToUpload", blob, basename(localPath));

    const { response, text } = await this.postFormWithRetry(form);

    if (!response.ok) {
      throw new AgnesCliError("UPLOAD_FAILED", `Litterbox upload failed with HTTP ${response.status}.`, {
        status: response.status,
        body: text,
      });
    }
    if (!/^https?:\/\//.test(text)) {
      throw new AgnesCliError("UPLOAD_FAILED", `Litterbox did not return a public URL: ${text}`);
    }
    return text;
  }

  private async postFormWithRetry(form: FormData): Promise<{ response: Response; text: string }> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= 2; attempt += 1) {
      try {
        const response = await this.fetchImpl(LITTERBOX_ENDPOINT, {
          method: "POST",
          body: form,
        });
        const text = (await response.text()).trim();
        return { response, text };
      } catch (error) {
        lastError = error;
        if (attempt === 2) {
          throw new AgnesCliError("UPLOAD_FAILED", "Litterbox upload failed before a response was received.", {
            cause: error instanceof Error ? error.message : String(error),
          });
        }
        await sleep(500);
      }
    }

    throw new AgnesCliError("UPLOAD_FAILED", "Litterbox upload failed before a response was received.", {
      cause: lastError instanceof Error ? lastError.message : String(lastError),
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
