import { gestureLabels, holdFrames, type Gesture } from './core'
import { stabilize, type Gate } from './sign-recognition'

export const shortcutLimit = 160
export type GestureShortcuts = Partial<Record<Gesture, string>>

export function parseShortcuts(raw: unknown): GestureShortcuts {
  if (!raw || typeof raw !== 'object') return {}
  const values = raw as Record<string, unknown>
  return Object.fromEntries(Object.keys(gestureLabels).flatMap(name => {
    const value = Object.hasOwn(values, name) ? values[name] : null
    return typeof value === 'string' && value.trim() && value.length <= shortcutLimit ? [[name, value.trim()]] : []
  }))
}

export function observeShortcut(gate: Gate, name: string, score: number, shortcuts: GestureShortcuts) {
  const reliable = Object.hasOwn(gestureLabels, name) && Number.isFinite(score) && score >= .82 && score <= 1
  // Track supported unmapped categories too. A different stable shape can end the held event.
  const text = reliable ? shortcuts[name as Gesture] ?? '' : ''
  const update = stabilize(gate, reliable ? { id: name, text, confidence: score } : null, { hold: holdFrames, release: 4 })
  return { gate: update.gate, text: update.committed?.text || null }
}
