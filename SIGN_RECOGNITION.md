# Uzbek Sign Language recognition

The `/kamera` workspace can show a live preview, draw local MediaPipe landmarks, and edit, copy, present, or speak a live transcript. There is no reviewed Uzbek Sign Language dataset or trained model bundled with this release. Automatic recognition stays unavailable until a reviewed artifact is explicitly configured. The separate `/kamera/tajriba` page demonstrates generic hand shapes.

## Dataset and verification

Start with a small vocabulary whose meanings and regional variants are checked with fluent Uzbek Sign Language signers and Deaf community partners. Record consent, data licensing, annotation criteria, exact vocabulary, collection conditions, signer demographics as appropriate, and dataset version. Include examples of each sign in motion, idle transitions, non-sign movements, unsupported signs, similar signs, signer variation, occlusion, and left- and right-hand use. Keep both data and documentation accessible to the people who will review the model, subject to participant consent.

Split by signer before training. Use a separate validation set to set decision and release thresholds, then report performance on held-out signers. Report per-class precision and recall, unknown false acceptances, insertion/duplication rates in sequences, and time to stable output. Review failures with fluent signers. Validate the final browser pipeline as well as the classifier. The app checks the model's format and provenance fields. The release owner must verify that the linked artifacts and evaluation evidence are genuine.

### Public research candidate

The [UzSLR prototype](https://github.com/khdbeck/uzslr-sign-language-prototype/tree/9039de7c07768a66f70b8212f484b902cb5c261d) documents 50 dynamic Uzbek signs from 10 signers. Its [split documentation](https://github.com/khdbeck/uzslr-sign-language-prototype/blob/9039de7c07768a66f70b8212f484b902cb5c261d/dataset-prep/README.md) says repetitions from the same signer can appear in training and test sets. Its reported results therefore do not establish performance on unseen signers. The pinned repository includes a PyTorch checkpoint at `inferencing/best_model.pth`. No redistribution license for the checkpoint or dataset was found in that revision. Before using the checkpoint in SadoAI, obtain permission, evaluate it on unseen signers and unknown signs, and export a compatible artifact or implement a separately evaluated browser adapter.

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

## Reproduce a candidate

Create a Python 3.12 virtual environment and install `research/requirements.txt`. Prepare JSON Lines with one window per row and the keys `signer` (pseudonymous), `split` (`train`, `validation`, or `test`), `label`, `handedness`, `perspective`, `lighting`, `reviewed`, `consent`, and `frames` (the normalized window). Include an `unknown` label for negative examples. Track consent and source recordings outside this input. Store neither names nor video in the training input.

Provide a vocabulary JSON with a `labels` object mapping approved sign IDs to Uzbek glosses, plus the `dataset` provenance object from the adapter contract. Run this from the repository root.

```sh
python research/train_sign_model.py windows.jsonl vocabulary.json model.json report.json
```

The trainer rejects signer overlap and writes per-class results, a confusion matrix, and the unknown false-accept rate. Select thresholds on validation windows, then freeze them before evaluating a reserved test set. The report covers isolated windows. Evaluate false insertions, repeats, latency and camera robustness separately on held-out video before publishing. The script expects preprocessed windows, and the project has no evidence yet that a linear classifier reaches usable accuracy on Uzbek signing.

## ONNX Web adapter

ONNX manifests use `schema: "sadoai-holistic-onnx-v1"` and the same language, provenance, calibration, and class-ID fields as the linear manifest. Supply a same-origin-with-the-manifest `modelUrl` and omit linear weights and biases. The graph must accept float32 `landmarks` with shape `[1, window, 248]` and return float32 `logits` with shape `[1, classCount]` in manifest order. Use embedded ONNX weights in one browser-compatible file. The browser checks the tensor names and runs a warm-up inference to check the output shape.

Timestamped frames are normalized to a 100-ms grid. Positions are interpolated between visible points, and missing-point channels use the nearest observed sample. The left/right landmark groups retain handedness information. The input includes the time-ordered motion trajectory, so the graph can calculate displacement or velocity between frames. Long gaps and missing required landmarks reset the window. The browser uses a single-threaded WASM runtime and keeps one model inference in flight.
