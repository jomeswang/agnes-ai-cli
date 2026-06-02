import test from "node:test";
import assert from "node:assert/strict";
import { pollVideo } from "../../dist/video/pollVideo.js";

test("pollVideo includes task details for not-found errors", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ error: "missing" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(
    () => pollVideo("task_123", {}, {
      apiKey: "test-key",
      fetchImpl,
    }),
    (error) => {
      assert.equal(error.code, "TASK_NOT_FOUND");
      assert.deepEqual(error.details, {
        taskId: "task_123",
        status: "failed",
        raw: { error: "missing" },
      });
      return true;
    },
  );
});
