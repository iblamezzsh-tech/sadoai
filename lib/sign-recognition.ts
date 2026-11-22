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

export function parseModel(input: unknown): Model {
  if (!record(input)) throw new Error('Invalid model')
  const { schema, language, dataset, validation, window, threshold, margin, hold, release, classes } = input
  if (schema !== 'sadoai-holistic-linear-v1' || language !== 'uz-sign' ||
    !record(dataset) || !['name', 'version', 'license', 'reference'].every(key => typeof dataset[key] === 'string' && String(dataset[key]).trim()) ||
    !record(validation) || validation.protocol !== 'signer-independent' || typeof validation.report !== 'string' || !validation.report.trim() ||
    !integer(window, 6, 24) || !bounded(threshold, .75, 1) || !bounded(margin, .1, 1) ||
    !integer(hold, 2, 12) || !integer(release, 3, 24) || !Array.isArray(classes) || classes.length < 2 || classes.length > 32) {
    throw new Error('Invalid model metadata')
  }
  const ids = new Set<string>()
  const parsed = classes.map((item: unknown): SignClass => {
    if (!record(item) || typeof item.id !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id) ||
      !bounded(item.bias, -100, 100) || !Array.isArray(item.weights) || item.weights.length !== window * frameWidth ||
      !item.weights.every(weight => bounded(weight, -100, 100)) ||
      (item.id === 'unknown' ? item.text !== undefined : typeof item.text !== 'string' || !item.text.trim() || item.text.length > 120)) {
      throw new Error('Invalid model class')
    }
    ids.add(item.id)
    return { id: item.id, text: typeof item.text === 'string' ? item.text.trim() : undefined, bias: item.bias, weights: item.weights }
  })
  if (!ids.has('unknown')) throw new Error('Missing rejection class')
  return { window, threshold, margin, policy: { hold, release }, classes: parsed }
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
  const peak = Math.max(...logits)
  const scores = logits.map(logit => Math.exp(logit - peak))
  const sum = scores.reduce((total, score) => total + score, 0)
  const best = scores.indexOf(1)
  const item = model.classes[best]
  if (!item?.text || !Number.isFinite(sum)) return null
  const confidence = scores[best] / sum
  const runnerUp = Math.max(...scores.filter((_, index) => index !== best)) / sum
  return confidence >= model.threshold && confidence - runnerUp >= model.margin ? { id: item.id, text: item.text, confidence } : null
}
