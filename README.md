# agnes-ai-cli

Standalone CLI and Node client for Agnes AI text, image, and video workflows, plus auth and media URL bridging.

## Install

```bash
npm install -g agnes-ai-cli
```

Or run on demand:

```bash
npx -y agnes-ai-cli --help
```

Every command layer exposes `--help`, for example:

```bash
agnes --help
agnes image --help
agnes image img2img --help
agnes video keyframes --help
```

## Commands

```bash
agnes auth check
agnes auth save-key --key sk-...

agnes media url ./input.png

agnes text chat --prompt "Reply with exactly pong."

agnes image text2img --prompt "A luminous city at sunrise"
agnes image img2img --image ./input.png --prompt "Turn this into an editorial campaign"
agnes image compose --image ./a.png --image ./b.png --prompt "Blend these references"

agnes video text2video --prompt "A cinematic beach scene at sunset"
agnes video img2video --image ./frame.png --prompt "Add gentle wind and a soft push-in"
agnes video multivideo --image ./a.png --image ./b.png --prompt "Blend these references into one motion concept"
agnes video keyframes --image ./frame-a.png --image ./frame-b.png --prompt "Transition between the frames"
agnes video poll task_123
```

## Library

```ts
import { createAgnesClient } from "agnes-ai-cli";

const agnes = createAgnesClient({
  apiKey: process.env.AGNES_API_KEY,
});

const image = await agnes.image.generate({
  mode: "text2img",
  prompt: "A luminous city at sunrise",
});
```

The Node client uses unified `generate({ mode })` entry points:

- `agnes.text.complete({ prompt, model? })`
- `agnes.image.generate({ mode: "text2img" | "img2img" | "compose", ... })`
- `agnes.video.generate({ mode: "text2video" | "img2video" | "multivideo" | "keyframes", ... })`
- `agnes.video.poll(taskId, options?)`
