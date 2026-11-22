import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addEntry, confirmGesture, defaults, holdFrames, insertPhrase, observeGesture, parseHistory, parsePreferences, quick, readLocal, removeLocal, saveLocal,
  type Candidate,
} from '../lib/core'
import { polishSpacing } from '../lib/browser'

test('phrases append to multiline Unicode text and remain editable', () => {
  assert.equal(insertPhrase('', quick[0]), 'Assalomu alaykum')
  assert.equal(insertPhrase('O‘zbekiston\nSavolim bor  ', 'Yo‘q'), 'O‘zbekiston\nSavolim bor\nYo‘q')
})

test('spacing proposal preserves names, numbers, negation and punctuation', () => {
  assert.equal(polishSpacing('  Nozima  42  bormaydimi?  \n Yo‘q! '), 'Nozima 42 bormaydimi?\nYo‘q!')
})

test('timeline rejects blank messages and validates restored entries', () => {
  const item = { id: '1', text: ' Javob ', speaker: 'partner' } as const
  assert.deepEqual(addEntry([], { ...item, text: ' ' }), [])
  const saved = addEntry([], item)
  assert.deepEqual(parseHistory([null, ...saved, { ...item, speaker: 'unknown' }]), [{ ...item, text: 'Javob' }])
})

test('preferences round trip and reject invalid stored values', () => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key),
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } })
  try {
    const settings = parsePreferences({ theme: 'dark', camera: 'environment', rate: 900, history: 'yes', language: '__proto__' })
    assert.deepEqual(settings, { ...defaults, theme: 'dark', camera: 'environment' })
    saveLocal('prefs', settings)
    assert.deepEqual(parsePreferences(readLocal('prefs', null)), settings)
    removeLocal('prefs')
    assert.deepEqual(parsePreferences(readLocal('prefs', null)), defaults)
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('uncertain or unsupported gestures reset the hold', () => {
  const sample = observeGesture(null, 'Open_Palm', .8)
  assert.equal(confirmGesture(sample), null)
  assert.equal(observeGesture(sample, 'Open_Palm', .749), null)
  assert.equal(observeGesture(sample, 'Open_Palm', NaN), null)
  assert.equal(observeGesture(sample, 'toString', .999), null)
  assert.equal(observeGesture(sample, 'Victory', .9)?.frames, 1)
})

test('confirmation yields only the supported gesture label after a stable hold', () => {
  let sample: Candidate | null = null
  for (let i = 1; i <= holdFrames; i++) {
    sample = observeGesture(sample, 'Open_Palm', .75)
    assert.equal(confirmGesture(sample), i === holdFrames ? 'Ochiq kaft' : null)
  }
})
