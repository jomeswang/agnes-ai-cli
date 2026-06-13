import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVideoTask } from "../../dist/video/generateVideo.js";
import { normalizeVideoRequest, validateVideoSettings } from "../../dist/video/normalizeVideoRequest.js";

test("normalizeVideoRequest maps keyframes to extra_body.mode", () => {
  const payload = normalizeVideoRequest(
    {
      mode: "keyframes",
      images: ["https://example.com/a.png", "https://example.com/b.png"],
      prompt: "transition",
    },
    ["https://example.com/a.png", "https://example.com/b.png"],
  );
  assert.equal(payload.extra_body.mode, "keyframes");
});

test("validateVideoSettings enforces 8n + 1", () => {
  assert.throws(
    () => validateVideoSettings({ numFrames: 120, frameRate: 24, mode: "text2video", imageCount: 0 }),
    /8n \+ 1/,
  );
});

test("normalizeVideoTask preserves the video_id returned by Agnes", () => {
  const result = normalizeVideoTask({
    id: "task_123",
    task_id: "task_123",
    video_id: "video_123",
    model: "agnes-video-v2.0",
    status: "queued",
  });

  assert.equal(result.taskId, "task_123");
  assert.equal(result.videoId, "video_123");
});
