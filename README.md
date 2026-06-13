# agnes-ai-cli

CLI and JS API for Agnes text, image, and video workflows.

## Install

Install globally:

```bash
npm install -g agnes-ai-cli
```

Run without installing:

```bash
npx -y agnes-ai-cli --help
```

## CLI

```bash
agnes --help
agnes auth check
agnes media url ./input.png
agnes text chat --prompt "say pong"
agnes image text2img --prompt "a polished product photo of a perfume bottle"
agnes image img2img --image ./input.png --prompt "turn this into a clean editorial poster"
agnes video text2video --prompt "a cinematic drone shot of waves at dusk"
agnes video img2video --image ./frame.png --prompt "animate subtle rain and drifting fog"
agnes video multivideo --image ./frame-a.png --image ./frame-b.png --prompt "blend these references into one motion concept"
agnes video keyframes --image ./frame-a.png --image ./frame-b.png --prompt "morph between the two scenes"
agnes video poll <video-or-task-id>
```

Local media inputs are uploaded to a temporary public URL automatically. The default bridge tries x0.at first, then falls back to tmpfiles, Uguu, and Litterbox.
Video creation is asynchronous. Create commands print both `taskId` and `videoId` when Agnes returns them; use `videoId` with `agnes video poll`. Passing an older `taskId` still works through the legacy polling endpoint.

## JS API

```js
import { createAgnesClient } from "agnes-ai-cli";

const agnes = createAgnesClient({ apiKey: process.env.AGNES_API_KEY });

const image = await agnes.image.generate({
  mode: "text2img",
  prompt: "A cinematic product shot of a silver watch on black stone."
});

console.log(image.url);
```
