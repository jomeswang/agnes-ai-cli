import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVideoResult, pollVideo } from "../../dist/video/pollVideo.js";

test("pollVideo includes video details for not-found errors", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error: "missing" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(
    () => pollVideo("video_123", {}, {
      apiKey: "test-key",
      fetchImpl,
    }),
    (error) => {
      assert.equal(error.code, "TASK_NOT_FOUND");
      assert.deepEqual(error.details, {
        videoId: "video_123",
        status: "failed",
        raw: { error: "missing" },
      });
      return true;
    },
  );
});

test("pollVideo retrieves video results with the recommended video_id endpoint", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    return new Response(JSON.stringify({
      id: "task_123",
      video_id: "video_123",
      model: "agnes-video-v2.0",
      status: "completed",
      remixed_from_video_id: "https://example.com/result.mp4",
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await pollVideo("video_123", {}, {
    apiKey: "test-key",
    baseUrl: "https://apihub.agnes-ai.com/v1",
    fetchImpl,
  });

  assert.equal(requestedUrls[0], "https://apihub.agnes-ai.com/agnesapi?video_id=video_123");
  assert.equal(result.taskId, "task_123");
  assert.equal(result.videoId, "video_123");
  assert.equal(result.videoUrl, "https://example.com/result.mp4");
});

test("normalizeVideoResult preserves video ids returned as id by the recommended endpoint", () => {
  const result = normalizeVideoResult({
    id: "video_123",
    model: "agnes-video-v2.0",
    status: "completed",
    remixed_from_video_id: "https://example.com/result.mp4",
  });

  assert.equal(result.taskId, "video_123");
  assert.equal(result.videoId, "video_123");
});
