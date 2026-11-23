import { cp, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleFile = fileURLToPath(import.meta.resolve('@mediapipe/tasks-vision'))
const target = new URL('../public/vision/', import.meta.url)
await mkdir(target, { recursive: true })
await cp(dirname(moduleFile) + '/wasm', target, { recursive: true })

const ortFile = fileURLToPath(import.meta.resolve('onnxruntime-web/wasm'))
const ortTarget = new URL('onnx/', target)
await mkdir(ortTarget, { recursive: true })
for (const asset of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await cp(dirname(ortFile) + '/' + asset, new URL(asset, ortTarget))
}
