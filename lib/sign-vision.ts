import { loadVisionAsset } from './vision-assets'
import { classify, createLandmarkBuffer, encodeFrame, parseModel, parseOnnxContract, sampleInterval, type Landmarks, type Model, type Prediction, type SignPolicy } from './sign-recognition'

const holisticUrl = process.env.NEXT_PUBLIC_HOLISTIC_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-assets/tasks/testdata/vision/holistic_landmarker.task?generation=1782184828108467'
export type SequenceModel = {
  window: number
  policy: SignPolicy
  evaluate(frames: readonly Float32Array[]): Prediction | null | Promise<Prediction | null>
  close?(): Promise<void>
}

async function download(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Model response ' + response.status)
  return response
}

export async function loadSignModel(url: string, signal: AbortSignal): Promise<SequenceModel> {
  const response = await download(url, signal)
  const manifest: unknown = await response.json()
  if (manifest && typeof manifest === 'object' && 'schema' in manifest && manifest.schema === 'sadoai-holistic-onnx-v1') {
    const contract = parseOnnxContract(manifest)
    const base = new URL(response.url || url, location.href)
    const modelUrl = new URL(contract.modelUrl, base)
    if (modelUrl.origin !== base.origin) throw new Error('ONNX model must share its manifest origin')
    const { createOnnxModel } = await import('./sign-onnx')
    const bytes = await loadVisionAsset(modelUrl.href, signal)
    signal.throwIfAborted()
    const model = await createOnnxModel(contract, bytes)
    if (signal.aborted) { await model.close?.(); signal.throwIfAborted() }
    return model
  }
  const linear = parseModel(manifest)
  return { window: linear.window, policy: linear.policy, evaluate: frames => classify(linear, frames) }
}

export async function createLandmarker(signal: AbortSignal) {
  const [runtime, asset] = await Promise.all([import('@mediapipe/tasks-vision'), loadVisionAsset(holisticUrl, signal)])
  const modelAssetBuffer = new Uint8Array(asset)
  const files = await runtime.FilesetResolver.forVisionTasks('/vision')
  signal.throwIfAborted()
  const landmarker = await runtime.HolisticLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetBuffer, delegate: 'CPU' },
    runningMode: 'VIDEO',
    outputPoseSegmentationMasks: false,
  })
  if (signal.aborted) {
    landmarker.close()
    signal.throwIfAborted()
  }
  return landmarker
}

export function createSequenceReader(model: Model): {
  reset(): void
  predict(landmarks: Landmarks, aspect: number, at?: number): Prediction | null
}
export function createSequenceReader(model: SequenceModel): {
  reset(): void
  predict(landmarks: Landmarks, aspect: number, at: number): Prediction | null | Promise<Prediction | null>
}
export function createSequenceReader(model: Model | SequenceModel) {
  const buffer = createLandmarkBuffer(model.window)
  let timestamp = 0
  return {
    reset() { buffer.reset() },
    predict(landmarks: Landmarks, aspect: number, at = (timestamp += sampleInterval)) {
      const frame = encodeFrame(landmarks, aspect)
      if (!frame) { buffer.reset(); return null }
      const frames = buffer.push(frame, at)
      if (!frames) return null
      return 'evaluate' in model ? model.evaluate(frames) : classify(model, frames)
    },
  }
}
