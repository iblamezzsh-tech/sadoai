import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classify, createLandmarkBuffer, decodeLogits, parseOnnxContract, emptyGate, encodeFrame, frameWidth, parseModel, stabilize, type Prediction } from '../lib/sign-recognition'
import { createSequenceReader } from '../lib/sign-vision'

test('stable signs append in order, held signs do not repeat, and release permits a repeat', () => {
  const a = { id: 'a', text: 'Fixture A', confidence: .95 }
  const b = { id: 'b', text: 'Fixture B', confidence: .97 }
  let gate = emptyGate
  const tokens: string[] = []
  const observe = (...predictions: (Prediction | null)[]) => {
    for (const prediction of predictions) {
      const result = stabilize(gate, prediction, { hold: 2, release: 3 })
      gate = result.gate
      if (result.committed) tokens.push(result.committed.id)
    }
  }
  observe(a, null, a)
  assert.deepEqual(tokens, [])
  observe(a, a, a, null, a, a, b)
  assert.deepEqual(tokens, ['a'])
  observe(b, b, null, null, null, b, b)
  assert.deepEqual(tokens, ['a', 'b', 'b'])
})

function fixture() {
  const weights = Array<number>(6 * frameWidth).fill(0)
  return {
    schema: 'sadoai-holistic-linear-v1', language: 'uz-sign',
    dataset: { name: 'Synthetic test fixture', version: '0', license: 'Test only', reference: 'Fixture only' },
    validation: { protocol: 'signer-independent', report: 'Fixture only' },
    window: 6, threshold: .8, margin: .15, hold: 2, release: 3,
    classes: [
      { id: 'unknown', weights, bias: 2 },
      { id: 'fixture', text: 'Fixture label', weights: weights.map((_, index) => index === 5 * frameWidth + 3 ? 8 : 0), bias: 0 },
    ],
  }
}

test('classifier requires documented metadata, a reject class and correctly sized weights', () => {
  const input = fixture()
  assert.throws(() => parseModel({ ...input, validation: {} }))
  assert.throws(() => parseModel({ ...input, classes: input.classes.map(item => ({ ...item, id: 'fixture' })) }))
  assert.throws(() => parseModel({ ...input, classes: input.classes.map(item => ({ ...item, weights: [] })) }))
})

test('missing, unknown and ambiguous windows yield no text', () => {
  const input = fixture()
  const model = parseModel(input)
  const frames = Array.from({ length: 6 }, () => new Float32Array(frameWidth))
  assert.equal(classify(model, frames.slice(1)), null)
  assert.equal(classify(model, frames), null)
  frames[5][3] = .25
  assert.equal(classify(model, frames), null)
  frames[5][3] = 1
  assert.equal(classify(model, frames)?.text, 'Fixture label')
})

test('sequence reader requires visible upper body and restarts the window after a missing hand', () => {
  const pose = Array.from({ length: 33 }, (_, i) => ({ x: i === 11 ? .3 : .6, y: .5, z: 0 }))
  const data = { poseLandmarks: pose, leftHandLandmarks: [{ x: .45, y: .5, z: 0 }], rightHandLandmarks: [], faceLandmarks: [] }
  const missing = { ...data, leftHandLandmarks: [] }
  assert.equal(encodeFrame(missing, 1), null)
  assert.equal(encodeFrame(data, 1)?.[3], 1)
  assert.equal(encodeFrame(data, 1)?.[21 * 4 + 3], 0)
  const sequence = createSequenceReader(parseModel(fixture()))
  for (let i = 0; i < 5; i++) assert.equal(sequence.predict(data, 1), null)
  assert.equal(sequence.predict(missing, 1), null)
  for (let i = 0; i < 5; i++) assert.equal(sequence.predict(data, 1), null)
  assert.equal(sequence.predict(data, 1)?.id, 'fixture')
})

test('timestamped windows normalize irregular video frames and reset after a stall', () => {
  const buffer = createLandmarkBuffer(6)
  const frame = (at: number) => {
    const data = new Float32Array(frameWidth)
    data[0] = at
    data[3] = 1
    return data
  }
  for (const at of [0, 105, 219, 320, 401]) assert.equal(buffer.push(frame(at), at), null)
  const sequence = buffer.push(frame(510), 510)
  assert.deepEqual(sequence?.map(item => item[0]), [10, 110, 210, 310, 410, 510])
  assert.equal(buffer.push(frame(510), 510), null)
  assert.equal(buffer.push(frame(1000), 1000), null)
})

test('ONNX metadata preserves label order and rejects invalid scores and unknown labels', () => {
  const manifest = parseOnnxContract({ ...fixture(), schema: 'sadoai-holistic-onnx-v1', modelUrl: 'fixture.onnx' })
  assert.deepEqual(manifest.labels.map(label => label.id), ['unknown', 'fixture'])
  assert.equal(decodeLogits(manifest.labels, [7, 0], .8, .15), null)
  assert.equal(decodeLogits(manifest.labels, [6, 6], .8, .15), null)
  assert.equal(decodeLogits(manifest.labels, [NaN, 8], .8, .15), null)
  assert.equal(decodeLogits(manifest.labels, [0, 8], .8, .15)?.id, 'fixture')
})
