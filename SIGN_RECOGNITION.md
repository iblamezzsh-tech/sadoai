# Uzbek Sign Language recognition

The `/kamera` workspace can show a live preview, draw local MediaPipe landmarks, and edit, copy, present, or speak a live transcript. There is no reviewed Uzbek Sign Language dataset or trained model bundled with this release. Automatic recognition stays unavailable until a reviewed artifact is explicitly configured. The separate `/kamera/tajriba` page demonstrates generic hand shapes.

## Dataset and verification

Start with a small vocabulary whose meanings and regional variants are checked with fluent Uzbek Sign Language signers and Deaf community partners. Record consent, data licensing, annotation criteria, exact vocabulary, collection conditions, signer demographics as appropriate, and dataset version. Include examples of each sign in motion, idle transitions, non-sign movements, unsupported signs, similar signs, signer variation, occlusion, and left- and right-hand use. Keep both data and documentation accessible to the people who will review the model, subject to participant consent.

Split by signer before training. Use a separate validation set to set decision and release thresholds, then report performance on held-out signers. Report per-class precision and recall, unknown false acceptances, insertion/duplication rates in sequences, and time to stable output. Review failures with fluent signers. Validate the final browser pipeline as well as the classifier. The app checks the model's format and provenance fields. The release owner must verify that the linked artifacts and evaluation evidence are genuine.

## Adapter contract

The initial `sadoai-holistic-linear-v1` adapter evaluates a learned softmax classifier over a short window. Export a model only if this architecture meets the acceptance criteria on held-out users. More capable temporal networks or continuous decoders can implement the same prediction interface.

Train and export using the feature order in `lib/sign-recognition.ts`:

- Sample distinct video frames at approximately 10 Hz. Extract landmarks from the same MediaPipe Holistic model used by the browser. Use the unmirrored source pixels, with left and right as returned by MediaPipe.
- A frame has 248 features. It contains 21 left hand points, 21 right hand points, pose points `0,11,12,13,14,15,16,23,24`, and face points `33,133,362,263,1,61,291,13,14,105,334`, in that order.
- Each point has four values `[x', y', z', present]`. Subtract the shoulder midpoint from x and y. Multiply x and z by video width divided by height. Divide x, y, and z by the aspect-adjusted shoulder separation. Fill missing points with zero. Reject frames if both hands are missing, either shoulder has visibility below 0.5, or projected shoulder separation is below 0.025. Flatten the window oldest frame first.
- Export JSON with `schema: "sadoai-holistic-linear-v1"`, `language: "uz-sign"`, and a `dataset` object with nonempty `name`, `version`, `license`, and `reference` strings. Include `validation: { "protocol": "signer-independent", "report": "URL or report reference" }`.
- Set calibrated `window` (6–24 frames), `threshold` (0.75–1), `margin` (0.1–1 above the runner-up), `hold` (2–12 consecutive accepted predictions), and `release` (3–24 rejected samples before allowing the same token again).
- Supply 2–32 `classes` with unique lowercase IDs, finite `bias`, and `weights` of length `window * 248`. Biases and weights must be in −100 to 100. Each supported vocabulary item has an approved Uzbek `text` value. Include an `unknown` class without text. Train that class on negative examples. The lightweight model may require score calibration before export.

## Integration and release

1. Host the reviewed JSON on the same origin or an approved HTTPS endpoint with CORS. Set `NEXT_PUBLIC_UZ_SIGN_MODEL_URL` for the build. The default MediaPipe landmark asset is pinned to the generation recorded in Google's MediaPipe asset manifest. For restricted networks, host a verified copy locally and set `NEXT_PUBLIC_HOLISTIC_MODEL_URL`. The source asset pinned in `lib/sign-vision.ts` has upstream SHA-256 `e2dab61191e2dcd0a15f943d8e3ed1dce13c82dfa597b9dd39f562975a50c3f8`.
2. Build over HTTPS, then test on supported devices with fluent signers. Confirm that each supported sign is appended automatically after stabilization, different signs append in order, a held sign is suppressed, sustained rejection permits intentional repetition, unknown signs do not add text, and edited text is spoken correctly.
3. Verify overlays, camera switching and cleanup, startup latency, sustained CPU load, and effects of device orientation and lighting. Test signers and sequences absent from training. Leave the model URL unset if real-device verification fails.

The current gate accepts a different stable label immediately after the configured hold. It releases a repeated label after the configured run of rejections. A stalled video resets the pending window and stability counter while keeping the last committed ID latched. Each emitted label is a vocabulary item, and sequence text preserves their order. Sentence interpretation and continuous sign-language decoding require separate evaluation and are outside this adapter.
