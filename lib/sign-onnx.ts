import { decodeLogits, frameWidth, type OnnxContract } from './sign-recognition'
import type { SequenceModel } from './sign-vision'

export async function createOnnxModel(manifest: OnnxContract, bytes: ArrayBuffer): Promise<SequenceModel> {
  const runtime = await import('onnxruntime-web/wasm')
  runtime.env.wasm.numThreads = 1
  runtime.env.wasm.wasmPaths = '/vision/onnx/'
  const session = await runtime.InferenceSession.create(bytes, { executionProviders: ['wasm'] })
  try {
    if (session.inputNames.length !== 1 || session.outputNames.length !== 1 ||
        session.inputNames[0] !== 'landmarks' || session.outputNames[0] !== 'logits') {
      throw new Error('Invalid ONNX input or output names')
    }
    const values = new Float32Array(manifest.window * frameWidth)
    async function evaluate(frames: readonly Float32Array[]) {
      frames.forEach((frame, index) => values.set(frame, index * frameWidth))
      const result = await session.run({ landmarks: new runtime.Tensor('float32', values, [1, manifest.window, frameWidth]) })
      const output = result.logits
      if (!output || !(output.data instanceof Float32Array) || output.dims.length !== 2 || output.dims[0] !== 1 || output.dims[1] !== manifest.labels.length) {
        throw new Error('Invalid ONNX logit shape')
      }
      return decodeLogits(manifest.labels, Array.from(output.data), manifest.threshold, manifest.margin)
    }
    await evaluate(Array.from({ length: manifest.window }, () => new Float32Array(frameWidth)))
    return { window: manifest.window, policy: manifest.policy, evaluate, close: () => session.release() }
  } catch (error) {
    await session.release()
    throw error
  }
}
