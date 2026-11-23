export type Prediction = { id: string; text: string; confidence: number }
export type SignPolicy = { hold: number; release: number }
export type Gate = { candidate: string | null; count: number; last: string | null; quiet: number }
export const emptyGate: Gate = { candidate: null, count: 0, last: null, quiet: 0 }

export function stabilize(gate: Gate, prediction: Prediction | null, policy: SignPolicy) {
  if (!prediction) {
    const quiet = Math.min(gate.quiet + 1, policy.release)
    return {
      gate: { candidate: null, count: 0, last: quiet >= policy.release ? null : gate.last, quiet },
      committed: null,
    }
  }
  const count = gate.candidate === prediction.id ? Math.min(gate.count + 1, policy.hold) : 1
  const committed = count >= policy.hold && prediction.id !== gate.last ? prediction : null
  return { gate: { candidate: prediction.id, count, last: committed?.id ?? gate.last, quiet: 0 }, committed }
}

export const poseIndices = [0, 11, 12, 13, 14, 15, 16, 23, 24] as const
export const faceIndices = [33, 133, 362, 263, 1, 61, 291, 13, 14, 105, 334] as const
type Point = { x: number; y: number; z: number; visibility?: number }
export type Landmarks = { poseLandmarks: Point[]; faceLandmarks: Point[]; leftHandLandmarks: Point[]; rightHandLandmarks: Point[] }
const groups = [21, 21, poseIndices.length, faceIndices.length]
export const frameWidth = groups.reduce((sum, length) => sum + length * 4, 0)

export function encodeFrame(data: Landmarks, aspect: number): Float32Array | null {
  const { poseLandmarks: pose, faceLandmarks: face, leftHandLandmarks: left, rightHandLandmarks: right } = data
  const shoulders = [pose[11], pose[12]]
  if (!shoulders.every(point => point && (point.visibility ?? 1) >= .5) || (!left.length && !right.length) || !Number.isFinite(aspect) || aspect <= 0) return null
  const [a, b] = shoulders
  const centerX = (a.x + b.x) / 2
  const centerY = (a.y + b.y) / 2
  const scale = Math.hypot((b.x - a.x) * aspect, b.y - a.y)
  if (!Number.isFinite(scale) || scale < .025) return null
  const points = [
    ...Array.from({ length: 21 }, (_, i) => left[i]),
    ...Array.from({ length: 21 }, (_, i) => right[i]),
    ...poseIndices.map(i => pose[i] && (pose[i].visibility ?? 1) >= .5 ? pose[i] : undefined),
    ...faceIndices.map(i => face[i]),
  ]
  const frame = new Float32Array(frameWidth)
  for (const [index, point] of points.entries()) {
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) continue
    const offset = index * 4
    frame.set([(point.x - centerX) * aspect / scale, (point.y - centerY) / scale, point.z * aspect / scale, 1], offset)
  }
  return frame
}

type SignClass = { id: string; text?: string; weights: number[]; bias: number }
export type Model = { window: number; threshold: number; margin: number; policy: SignPolicy; classes: SignClass[] }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const bounded = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const integer = (value: unknown, min: number, max: number): value is number => bounded(value, min, max) && Number.isInteger(value)

function parseModelMetadata(input: Record<string, unknown>) {
  const { language, dataset, validation, window, threshold, margin, hold, release, classes } = input
  if (language !== 'uz-sign' ||
    !record(dataset) || !['name', 'version', 'license', 'reference'].every(key => typeof dataset[key] === 'string' && String(dataset[key]).trim()) ||
    !record(validation) || validation.protocol !== 'signer-independent' || typeof validation.report !== 'string' || !validation.report.trim() ||
    !integer(window, 6, 24) || !bounded(threshold, .75, 1) || !bounded(margin, .1, 1) ||
    !integer(hold, 2, 12) || !integer(release, 3, 24) || !Array.isArray(classes) || classes.length < 2 || classes.length > 32) {
    throw new Error('Invalid model metadata')
  }
  return { window, threshold, margin, policy: { hold, release } }
}

function parseModelLabels(classes: unknown[]): ModelLabel[] {
  const ids = new Set<string>()
  const labels = classes.map(item => {
    if (!record(item) || typeof item.id !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id) ||
      (item.id === 'unknown' ? item.text !== undefined : typeof item.text !== 'string' || !item.text.trim() || item.text.length > 120)) {
      throw new Error('Invalid model class')
    }
    ids.add(item.id)
    return { id: item.id, text: typeof item.text === 'string' ? item.text.trim() : undefined }
  })
  if (!ids.has('unknown')) throw new Error('Missing rejection class')
  return labels
}

export function parseModel(input: unknown): Model {
  if (!record(input) || input.schema !== 'sadoai-holistic-linear-v1' || !Array.isArray(input.classes)) throw new Error('Invalid model')
  const metadata = parseModelMetadata(input)
  const labels = parseModelLabels(input.classes)
  const classes = input.classes.map((item: unknown, index): SignClass => {
    if (!record(item) || !bounded(item.bias, -100, 100) || !Array.isArray(item.weights) ||
      item.weights.length !== metadata.window * frameWidth || !item.weights.every(weight => bounded(weight, -100, 100))) {
      throw new Error('Invalid model weights')
    }
    return { ...labels[index], bias: item.bias, weights: item.weights }
  })
  return { ...metadata, classes }
}

export function classify(model: Model, frames: readonly Float32Array[]): Prediction | null {
  if (frames.length !== model.window || frames.some(frame => frame.length !== frameWidth)) return null
  const logits = model.classes.map(item => {
    let logit = item.bias
    for (const [index, frame] of frames.entries()) {
      const offset = index * frameWidth
      for (let i = 0; i < frame.length; i++) logit += frame[i] * item.weights[offset + i]
    }
    return logit
  })
  return decodeLogits(model.classes, logits, model.threshold, model.margin)
}

export function decodeLogits(classes: readonly ModelLabel[], logits: readonly number[], threshold: number, margin: number): Prediction | null {
  if (classes.length !== logits.length || !logits.every(Number.isFinite)) return null
  const peak = Math.max(...logits)
  const scores = logits.map(logit => Math.exp(logit - peak))
  const sum = scores.reduce((total, score) => total + score, 0)
  const best = scores.indexOf(1)
  const item = classes[best]
  if (!item?.text || !Number.isFinite(sum)) return null
  const confidence = scores[best] / sum
  const runnerUp = Math.max(...scores.filter((_, index) => index !== best)) / sum
  return confidence >= threshold && confidence - runnerUp >= margin ? { id: item.id, text: item.text, confidence } : null
}

export const sampleInterval = 100
export const maxFrameGap = 350

/** Normalizes irregular camera samples to the model's fixed temporal grid. */
export function createLandmarkBuffer(window: number) {
  const samples: { at: number; frame: Float32Array }[] = []
  const duration = (window - 1) * sampleInterval
  return {
    reset() { samples.length = 0 },
    push(frame: Float32Array, at: number): Float32Array[] | null {
      const previous = samples.at(-1)
      if (!Number.isFinite(at) || (previous && at <= previous.at)) return null
      if (previous && at - previous.at > maxFrameGap) samples.length = 0
      const start = at - duration
      samples.push({ at, frame })
      while (samples.length > 1 && samples[1].at <= start) samples.shift()
      if (samples[0].at > start) return null
      let right = 0
      return Array.from({ length: window }, (_, index) => {
        const target = start + index * sampleInterval
        while (samples[right].at < target) right++
        const after = samples[right]
        if (after.at === target || right === 0) return after.frame
        const before = samples[right - 1]
        const alpha = (target - before.at) / (after.at - before.at)
        const mixed = new Float32Array(frameWidth)
        for (let offset = 0; offset < frameWidth; offset += 4) {
          if (!before.frame[offset + 3] || !after.frame[offset + 3]) {
            const nearest = alpha < .5 ? before.frame : after.frame
            mixed.set(nearest.subarray(offset, offset + 4), offset)
            continue
          }
          for (let i = offset; i < offset + 3; i++) mixed[i] = before.frame[i] + alpha * (after.frame[i] - before.frame[i])
          mixed[offset + 3] = 1
        }
        return mixed
      })
    },
  }
}

export type ModelLabel = { id: string; text?: string }
export type OnnxContract = { modelUrl: string; window: number; threshold: number; margin: number; policy: SignPolicy; labels: ModelLabel[] }

export function parseOnnxContract(input: unknown): OnnxContract {
  if (!record(input) || input.schema !== 'sadoai-holistic-onnx-v1' || typeof input.modelUrl !== 'string' ||
      !input.modelUrl.trim() || !Array.isArray(input.classes)) throw new Error('Invalid ONNX manifest')
  const common = parseModelMetadata(input)
  const labels = parseModelLabels(input.classes)
  return { ...common, labels, modelUrl: input.modelUrl }
}
