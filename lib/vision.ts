import { loadVisionAsset } from './vision-assets'
import type { GestureRecognizer } from '@mediapipe/tasks-vision'

const model = process.env.NEXT_PUBLIC_GESTURE_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

export async function createRecognizer(signal: AbortSignal): Promise<GestureRecognizer> {
  const [runtime, asset] = await Promise.all([
    import('@mediapipe/tasks-vision'),
    loadVisionAsset(model, signal),
  ])
  const modelAssetBuffer = new Uint8Array(asset)
  const files = await runtime.FilesetResolver.forVisionTasks('/vision')
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  return runtime.GestureRecognizer.createFromOptions(files, {
    baseOptions: { modelAssetBuffer, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
  })
}
