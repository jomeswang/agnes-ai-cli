import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(here, "../../bin/agnes.js");

test("root help renders", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Agnes AI text, image, and video workflows/);
  assert.match(result.stdout, /Examples:/);
});

test("text help renders", () => {
  const result = spawnSync(process.execPath, [cliPath, "text", "chat", "--help"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /one-shot Agnes chat completion/);
  assert.match(result.stdout, /\/chat\/completions/);
});

test("keyframes help renders", () => {
  const result = spawnSync(process.execPath, [cliPath, "video", "keyframes", "--help"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Generate a keyframe video/);
  assert.match(result.stdout, /--image/);
  assert.match(result.stdout, /Example:/);
  assert.match(result.stdout, /two or more times/);
  assert.match(result.stdout, /extra_body\.mode=keyframes/);
});

test("video poll help includes example and request-shape guidance", () => {
  const result = spawnSync(process.execPath, [cliPath, "video", "poll", "--help"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Example:/);
  assert.match(result.stdout, /\/agnesapi\?video_id=\{video_id\}/);
  assert.match(result.stdout, /asynchronous video creation command/);
});

test("json errors are machine-readable", () => {
  const result = spawnSync(process.execPath, [cliPath, "image", "text2img", "--prompt", "test", "--json"], {
    encoding: "utf8",
    env: {
      ...process.env,
      AGNES_API_KEY: "",
    },
  });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(parsed, {
    ok: false,
    code: "AUTH_MISSING",
    message: "AGNES_API_KEY is required for Agnes requests.",
  });
});
