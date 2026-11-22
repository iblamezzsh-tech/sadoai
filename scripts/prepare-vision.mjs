import { cp, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleFile = fileURLToPath(import.meta.resolve('@mediapipe/tasks-vision'))
const target = new URL('../public/vision/', import.meta.url)
await mkdir(target, { recursive: true })
await cp(dirname(moduleFile) + '/wasm', target, { recursive: true })
