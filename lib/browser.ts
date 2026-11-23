'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Preferences } from './core'

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}
export function polishSpacing(text: string) {
  return text.split('\n').map(line => line.trim().replace(/[ \t]+/g, ' ')).join('\n').trim()
}
export function useSpeech(prefs: Preferences) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [supported, setSupported] = useState<boolean | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const current = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') { setSupported(false); return }
    const refresh = () => setVoices(synth.getVoices())
    setSupported(true)
    refresh()
    synth.addEventListener('voiceschanged', refresh)
    return () => {
      synth.removeEventListener('voiceschanged', refresh)
      if (current.current) { current.current = null; synth.cancel() }
    }
  }, [])
  const matching = voices.filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === prefs.language.toLowerCase().split('-')[0])
  function stop() {
    current.current = null
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }
  function speak(text: string, allowDefault = false) {
    if (!supported || !text.trim() || (!matching.length && !allowDefault)) return
    stop()
    setVoiceError('')
    const speech = new SpeechSynthesisUtterance(text.trim())
    const voice = matching.find(item => item.localService) || matching[0] || voices.find(item => item.default)
    if (voice) { speech.voice = voice; speech.lang = voice.lang }
    speech.rate = prefs.rate
    const finish = (error?: string) => {
      if (current.current !== speech) return
      current.current = null
      setSpeaking(false)
      if (error) setVoiceError(error)
    }
    speech.onend = () => finish()
    speech.onerror = () => finish('Matnni ovozli o‘qib bo‘lmadi. Xabarni ekranda ko‘rsating.')
    current.current = speech
    setSpeaking(true)
    try { window.speechSynthesis.speak(speech) }
    catch { finish('Matnni ovozli o‘qib bo‘lmadi. Xabarni ekranda ko‘rsating.') }
  }
  return { supported, matching: matching.length > 0, speaking, voiceError, speak, stop }
}

type SpeechResult = { isFinal: boolean; 0: { transcript: string } }
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; processLocally?: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void; abort: () => void
}
type RecognitionClass = {
  new(): Recognition
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>
}
function speechClass() {
  const browser = window as Window & { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass }
  return browser.SpeechRecognition || browser.webkitSpeechRecognition
}
export function useRecognition(language: string, onText: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'listening'>('idle')
  const [error, setError] = useState('')
  const [interim, setInterim] = useState('')
  const session = useRef<Recognition | null>(null)
  const generation = useRef(0)
  const invalidate = useCallback(() => {
    generation.current++
    const active = session.current
    session.current = null
    active?.abort()
  }, [])
  useEffect(() => {
    setSupported(!!speechClass())
    return invalidate
  }, [invalidate])
  function cancel() {
    invalidate()
    setState('idle')
    setInterim('')
  }
  async function start() {
    const Recognition = speechClass()
    if (!Recognition || state !== 'idle') return
    const attempt = ++generation.current
    setState('loading')
    setError('')
    try {
      const availability = Recognition.available ? await Recognition.available({ langs: [language], processLocally: false }).catch(() => 'unknown') : 'unknown'
      if (attempt !== generation.current) return
      if (availability === 'unavailable') {
        setError('Brauzer tanlangan tilni taniy olmaydi. Javobni yozing yoki sozlamalardan boshqa tilni tanlang.')
        setState('idle')
        return
      }
      const recognition = new Recognition()
      session.current = recognition
      recognition.lang = language
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onstart = () => { if (session.current === recognition) setState('listening') }
      recognition.onend = () => {
        if (session.current !== recognition) return
        session.current = null
        setState('idle')
        setInterim('')
      }
      recognition.onerror = ({ error: code }) => {
        if (session.current !== recognition) return
        setError(code === 'not-allowed' || code === 'service-not-allowed' ? 'Mikrofonga ruxsat berilmadi. Javobni yozib kiriting.'
          : code === 'language-not-supported' ? 'Bu brauzer tanlangan tilni taniy olmaydi. Javobni yozing.'
          : code === 'no-speech' ? 'Ovoz eshitilmadi. Qayta urinib ko‘ring.'
          : code === 'network' ? 'Ovoz xizmati bilan aloqa uzildi. Javobni yozing.'
          : 'Mikrofon ishga tushmadi. Ruxsatlarni tekshirib, qayta urinib ko‘ring.')
      }
      recognition.onresult = event => {
        if (session.current !== recognition) return
        const draft = []
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const text = result[0].transcript.trim()
          if (!text) continue
          if (result.isFinal) onText(text)
          else draft.push(text)
        }
        setInterim(draft.join(' '))
      }
      recognition.start()
    } catch {
      if (attempt !== generation.current) return
      session.current = null
      setState('idle')
      setError('Mikrofon ishga tushmadi. Javobni yozing yoki ruxsatlarni tekshiring.')
    }
  }
  return { supported, state, error, interim, start, cancel, stop: () => session.current?.stop() }
}
