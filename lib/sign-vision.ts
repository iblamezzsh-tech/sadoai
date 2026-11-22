import { classify, encodeFrame, parseModel, type Landmarks, type Model } from './sign-recognition'

const holisticUrl = process.env.NEXT_PUBLIC_HOLISTIC_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-assets/tasks/testdata/vision/holistic_landmarker.task?generation=1782184828108467'
export const signModelUrl = process.env.NEXT_PUBLIC_UZ_SIGN_MODEL_URL
export const sampleInterval = 100

async function download(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Model response ' + response.status)
  return response
}

export async function loadSignModel(signal: AbortSignal) {
  return signModelUrl ? parseModel(await (await download(signModelUrl, signal)).json()) : null
}

export async function createLandmarker(signal: AbortSignal) {
  const [runtime, response] = await Promise.all([import('@mediapipe/tasks-vision'), download(holisticUrl, signal)])
  const modelAssetBuffer = new Uint8Array(await response.arrayBuffer())
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

export function createSequenceReader(model: Model) {
  const frames: Float32Array[] = []
  return {
    reset() { frames.length = 0 },
    predict(landmarks: Landmarks, aspect: number) {
      const frame = encodeFrame(landmarks, aspect)
      if (!frame) { frames.length = 0; return null }
      if (frames.length === model.window) frames.shift()
      frames.push(frame)
      return classify(model, frames)
    },
  }
}
