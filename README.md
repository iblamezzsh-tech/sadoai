# SadoAI 1.0

SadoAI is an Uzbek-language communication app for typing, displaying, and speaking messages in person. The camera lab experiments with seven MediaPipe hand shapes. Validated Uzbek Sign Language recognition is future research.

## Run locally

Use Node.js 22 or 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Next.js. No account, database, or key is required. Use HTTPS or localhost for browser media permissions. MediaPipe WASM assets are copied from the locked npm package before development and production builds.

By default, the camera lab downloads Google's versioned Gesture Recognizer model when the user turns on the camera. If network policy blocks `storage.googleapis.com`, allow that host or place an authorized copy of [Google's official model](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task) at `public/vision/gesture_recognizer.task`. Copy the example into `.env.local` and set `NEXT_PUBLIC_GESTURE_MODEL_URL=/vision/gesture_recognizer.task` before building.

## Verify

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite starts the production build and exercises desktop and mobile layouts, keyboard presentation mode, phrase workflows, settings, permission failure, offline text, and axe checks. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an installed Chromium build.

For device QA, try a supported Uzbek voice, microphone recognition, camera switching, and each hand shape on actual target devices. Verify that leaving the camera page releases the camera, unstable predictions stay unconfirmed, and a confirmed label never triggers speech by itself. Also check the experience with a screen reader and the device's largest text setting.

## Deploy

Deploy as a Next.js application with `npm ci`, `npm run build`, and `npm run start`. On a managed Next.js host, use its default Next.js preset and set the optional public model URL before building. Serve over HTTPS and use the app directly in a top-level tab for the media permission flows. Verify browser access to the model and serve `.wasm` as `application/wasm` if using a custom reverse proxy.

The production service worker caches core route documents and local scripts after the first successful load. Camera and browser speech services may still require a connection. Update the service worker cache version when a release changes precached assets.

## Limits and roadmap

- Voice availability and recognition languages depend on the browser, operating system, and device. Typing and large-text display are always available once the app has loaded.
- Gesture recognition is experimental. It needs good lighting, a supported camera, and an accessible model. Its score is a model confidence value for a hand shape.
- Spacing cleanup is deterministic and requires approval. No external text generation or Gemini integration is configured.
- Next steps include device validation with Uzbek speakers, usability research with Deaf and non-speaking people, and consent-based research into validated Uzbek Sign Language datasets and continuous signing.

See [architecture](ARCHITECTURE.md) for state, privacy, and extension points.

## Sign-to-text workspace

Open `/kamera` for permission-gated local camera preview, optional hand/face/upper-body landmarks, and an editable live transcript with speech and full-screen display. A validated Uzbek Sign Language model is required for automatic output. The generic hand-shape experiment is available at `/kamera/tajriba`. See [the sign model integration guide](SIGN_RECOGNITION.md) for dataset criteria, the export format, and release checks.
