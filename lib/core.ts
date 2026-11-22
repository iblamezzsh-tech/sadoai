export type Speaker = 'self' | 'partner'
export type Entry = { id: string; text: string; speaker: Speaker }
export type Preferences = {
  theme: 'system' | 'light' | 'dark'
  font: 'standard' | 'large' | 'extra'
  motion: boolean
  rate: number
  language: string
  camera: 'user' | 'environment'
  history: boolean
}
export const defaults: Preferences = { theme: 'system', font: 'standard', motion: true, rate: 1, language: 'uz-UZ', camera: 'user', history: false }
export const languages = { 'uz-UZ': 'O‘zbekcha', 'ru-RU': 'Ruscha', 'en-US': 'Inglizcha' } as const
export const categories = ['Kundalik suhbat', 'Salomlashish', 'Savollar', 'Ta’lim', 'Transport', 'Do‘kon va xizmatlar', 'Sog‘liq', 'Favqulodda yordam'] as const
export const phraseGroups = [
  ['Iltimos, sekinroq gapiring', 'Men sizni tushunmadim', 'Rahmat', 'Ha', 'Yo‘q', 'Yana bir marta takrorlang'],
  ['Assalomu alaykum', 'Xayrli kun', 'Tanishganimdan xursandman'],
  ['Iltimos, yozib bera olasizmi?', 'Buni qanday ishlataman?', 'Bu qayerda?'],
  ['Savolim bor', 'Topshiriqni yozib bera olasizmi?', 'Dars qachon boshlanadi?'],
  ['Bu avtobus qayerga boradi?', 'Keyingi bekatda tushaman', 'Chipta qancha turadi?'],
  ['Bu qancha turadi?', 'Karta bilan to‘lasam bo‘ladimi?', 'Iltimos, chek bering'],
  ['Men shifokor bilan gaplashmoqchiman', 'Menga tarjimon kerak', 'Iltimos, qabul vaqtini yozing'],
  ['Menga zudlik bilan yordam kerak.', 'Iltimos, tez yordam chaqiring.', 'Menga yordam kerak'],
] as const
export const allPhrases = phraseGroups.flatMap((group, groupIndex) => [...group].map((text, index) => ({
  text, category: categories[groupIndex], id: `${groupIndex}-${index}`,
})))
export const quick = [phraseGroups[1][0], phraseGroups[7][2], ...phraseGroups[0], phraseGroups[2][0], phraseGroups[6][0]]
export function insertPhrase(draft: string, phrase: string): string {
  return draft.trim() ? draft.trimEnd() + '\n' + phrase : phrase
}
export function readLocal(key: string, fallback: unknown): unknown {
  try { return JSON.parse(localStorage.getItem('sadoai:' + key) ?? 'null') ?? fallback }
  catch { return fallback }
}
export function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem('sadoai:' + key, JSON.stringify(value)) } catch { /* memory state remains usable */ }
}
export function removeLocal(key: string) {
  try { localStorage.removeItem('sadoai:' + key) } catch { /* storage unavailable */ }
}
export function parsePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return defaults
  const p = value as Partial<Preferences>
  return {
    theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
    font: p.font === 'large' || p.font === 'extra' ? p.font : 'standard',
    motion: p.motion !== false,
    rate: typeof p.rate === 'number' && p.rate >= .5 && p.rate <= 1.5 ? p.rate : 1,
    language: typeof p.language === 'string' && Object.hasOwn(languages, p.language) ? p.language : defaults.language,
    camera: p.camera === 'environment' ? p.camera : 'user',
    history: p.history === true,
  }
}
export function parseHistory(value: unknown): Entry[] {
  return Array.isArray(value) ? value.filter((entry): entry is Entry => !!entry && typeof entry.id === 'string' && typeof entry.text === 'string' && (entry.speaker === 'self' || entry.speaker === 'partner')).slice(-150) : []
}
export function addEntry(history: Entry[], entry: Entry) {
  return entry.text.trim() ? [...history, { ...entry, text: entry.text.trim() }].slice(-150) : history
}
export const gestureLabels = {
  Open_Palm: 'Ochiq kaft', Closed_Fist: 'Yumilgan musht', Thumb_Up: 'Bosh barmoq tepaga',
  Thumb_Down: 'Bosh barmoq pastga', Victory: 'V shakli', Pointing_Up: 'Ko‘rsatkich barmoq tepaga',
  ILoveYou: 'ILoveYou qo‘l shakli',
} as const
export type Gesture = keyof typeof gestureLabels
export type Candidate = { name: Gesture; score: number; frames: number }
export const holdFrames = 6
export function observeGesture(previous: Candidate | null, name: string, score: number): Candidate | null {
  if (!Object.hasOwn(gestureLabels, name) || !Number.isFinite(score) || score < .75 || score > 1) return null
  return { name: name as Gesture, score, frames: previous?.name === name ? Math.min(previous.frames + 1, holdFrames) : 1 }
}
export function confirmGesture(value: Candidate | null): string | null {
  return value && value.frames >= holdFrames && value.score >= .75 && value.score <= 1 && Object.hasOwn(gestureLabels, value.name) ? gestureLabels[value.name] : null
}
