import test from "node:test";
import assert from "node:assert/strict";
import { normalizeImageRequest } from "../../dist/image/normalizeImageRequest.js";

test("normalizeImageRequest keeps text2img minimal", () => {
  const payload = normalizeImageRequest(
    { mode: "text2img", prompt: "hello world" },
    [],
  );
  assert.equal(payload.model, "agnes-image-2.1-flash");
  assert.equal(payload.prompt, "hello world");
  assert.equal("extra_body" in payload, false);
});

test("normalizeImageRequest adds tags for image 2.0 image modes", () => {
  const payload = normalizeImageRequest(
    {
      mode: "img2img",
      model: "agnes-image-2.0-flash",
      image: "https://example.com/a.png",
      prompt: "restyle",
    },
    ["https://example.com/a.png"],
  );
  assert.deepEqual(payload.tags, ["img2img"]);
  assert.equal(payload.extra_body.image, "https://example.com/a.png");
});

test("normalizeImageRequest keeps compose as an array", () => {
  const payload = normalizeImageRequest(
    {
      mode: "compose",
      prompt: "merge",
      images: ["https://example.com/a.png", "https://example.com/b.png"],
    },
    ["https://example.com/a.png", "https://example.com/b.png"],
  );
  assert.deepEqual(payload.extra_body.image, ["https://example.com/a.png", "https://example.com/b.png"]);
});
