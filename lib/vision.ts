import type { GestureRecognizer } from '@mediapipe/tasks-vision'

const model = process.env.NEXT_PUBLIC_GESTURE_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task'

export async function createRecognizer(signal: AbortSignal): Promise<GestureRecognizer> {
  const [runtime, response] = await Promise.all([
    import('@mediapipe/tasks-vision'),
    fetch(model, { signal }),
  ])
  if (!response.ok) throw new Error('Model response ' + response.status)
  const modelAssetBuffer = new Uint8Array(await response.arrayBuffer())
  const files = await runtime.FilesetResolver.forVisionTasks('/vision')
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  return runtime.GestureRecognizer.createFromOptions(files, {
    baseOptions: { modelAssetBuffer, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 1,
  })
}
