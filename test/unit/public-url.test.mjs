import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { extname } from "node:path";
import { toPublicUrl } from "../../dist/media/toPublicUrl.js";

test("toPublicUrl uploads data URLs through the media provider", async () => {
  let uploadedPath;
  let uploadedContents;
  const result = await toPublicUrl("data:image/png;base64,aGVsbG8=", {}, {
    mediaProvider: {
      async upload(localPath) {
        uploadedPath = localPath;
        uploadedContents = await readFile(localPath, "utf8");
        return "https://example.com/uploaded.png";
      },
    },
  });

  assert.deepEqual(result, {
    ok: true,
    url: "https://example.com/uploaded.png",
    source: "provider",
  });
  assert.equal(uploadedContents, "hello");
  assert.ok(uploadedPath);
  assert.equal(extname(uploadedPath), ".png");
  await assert.rejects(() => access(uploadedPath));
});

test("toPublicUrl fetches and uploads loopback http URLs instead of passing them through", async () => {
  let fetchedUrl;
  let uploadedContents;
  const result = await toPublicUrl("http://127.0.0.1:3001/local-assets/image", {}, {
    fetchImpl: async (url) => {
      fetchedUrl = String(url);
      return new Response(Buffer.from("image-bytes"), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    },
    mediaProvider: {
      async upload(localPath) {
        uploadedContents = await readFile(localPath, "utf8");
        return "https://example.com/from-local.png";
      },
    },
  });

  assert.equal(fetchedUrl, "http://127.0.0.1:3001/local-assets/image");
  assert.equal(uploadedContents, "image-bytes");
  assert.deepEqual(result, {
    ok: true,
    url: "https://example.com/from-local.png",
    source: "provider",
  });
});

test("toPublicUrl still passes public http URLs through", async () => {
  const result = await toPublicUrl("https://cdn.example.com/image.png", {}, {
    mediaProvider: {
      async upload() {
        throw new Error("public URLs should not be uploaded");
      },
    },
  });

  assert.deepEqual(result, {
    ok: true,
    url: "https://cdn.example.com/image.png",
    source: "passthrough",
  });
});
