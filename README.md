# agnes-ai-cli

CLI and JS API for Agnes text, image, and video workflows.

## Install

Current verified distribution path:

```bash
npm install -g github:jomeswang/agnes-ai-cli
```

Ad hoc execution without a global install:

```bash
npx -y github:jomeswang/agnes-ai-cli --help
```

Planned npm package name:

```bash
agnes-ai-cli
```

Once the npm publish path is cleared, the package will also be installable as:

```bash
npm install -g agnes-ai-cli
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
agnes video poll <task-id>
```

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
