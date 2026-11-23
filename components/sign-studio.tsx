'use client'
import { useReducer, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AudioLines, Camera, CircleStop, Copy, Expand, FlaskConical, RotateCcw, ScanLine, Send, Square, Trash2, VideoOff, Volume2 } from 'lucide-react'
import { copyText, useSpeech } from '@/lib/browser'
import type { Prediction } from '@/lib/sign-recognition'
import { PageHeader, useSado } from './shell'
import { Dialog } from './ui/dialog'
import { useSignCamera } from './use-sign-camera'

type Token = Prediction & { key: string; before?: { length: number; suffix: string } }
type Transcript = { text: string; tokens: Token[]; paused: boolean }
type Action = { type: 'sign'; token: Token } | { type: 'edit'; value: string } | { type: 'pause' | 'undo' | 'clear' }
function updateTranscript(state: Transcript, action: Action): Transcript {
  switch (action.type) {
    case 'sign': {
      if (state.paused) return state
      const prefix = state.text.trimEnd()
      return { ...state, text: prefix ? prefix + ' ' + action.token.text : action.token.text,
        tokens: [...state.tokens.slice(-99), { ...action.token, before: { length: prefix.length, suffix: state.text.slice(prefix.length) } }] }
    }
    case 'edit': return { ...state, text: action.value, tokens: state.tokens.map(token => ({ ...token, before: undefined })) }
    case 'pause': return { ...state, paused: !state.paused }
    case 'clear': return { ...state, text: '', tokens: [] }
    case 'undo': {
      const previous = state.tokens.at(-1)?.before
      return previous === undefined ? state : { ...state, text: state.text.slice(0, previous.length) + previous.suffix, tokens: state.tokens.slice(0, -1) }
    }
  }
}
const readiness = {
  unavailable: 'Tasdiqlangan o‘zbek ishora tili modeli hali ulanmagan.',
  waiting: 'Model kamera yoqilganda tekshiriladi.',
  loading: 'Ishora tili modeli yuklanmoqda…',
  ready: 'Ishora tili modeli tayyor.',
  error: 'Ishora tili modelini ishga tushirib bo‘lmadi.',
}
export function SignStudio() {
  const { prefs, setNotice, incoming, setIncoming, online } = useSado()
  const router = useRouter()
  const [{ text, tokens, paused }, dispatch] = useReducer(updateTranscript, { text: '', tokens: [], paused: false })
  const [presentation, setPresentation] = useState<string | null>(null)
  const speech = useSpeech(prefs)
  const camera = useSignCamera(prefs.camera, prediction => {
    dispatch({ type: 'sign', token: { ...prediction, key: crypto.randomUUID() } })
  })
  const canUseText = !!text.trim()

  function sendToStudio() {
    setIncoming(text)
    router.push('/muloqot')
  }

  async function copy() {
    setNotice(await copyText(text) ? 'Matn nusxalandi.' : 'Nusxalab bo‘lmadi. Matnni belgilab, qo‘lda nusxalang.')
  }

  return <div className="shell workspace sign-workspace">
    <PageHeader eyebrow="KAMERA ORQALI MULOQOT" title="Ishoradan matnga" description="Ishoralardan hosil bo‘lgan o‘zbekcha matnni o‘qing, tahrirlang yoki ovoz chiqarib o‘qing." />
    <div className="sign-grid">
      <section className="panel stack sign-camera-panel" aria-labelledby="sign-camera-title">
        <div className="panel-heading sign-heading"><div className="row"><span className="tile mint"><Camera size={21} /></span><h2 id="sign-camera-title">Jonli kamera</h2></div><span className="sign-status">{camera.camera === 'active' ? 'Kamera yoqilgan' : camera.camera === 'permission' ? 'Ruxsat kutilmoqda' : 'Kamera o‘chiq'}</span></div>
        <div className="camera-view sign-view">
          {camera.camera !== 'active' && <div className="camera-idle"><VideoOff size={35} /><strong>{camera.camera === 'permission' ? 'Kameraga ruxsat bering' : 'Kamerani yoqish uchun tugmani bosing'}</strong></div>}
          <video ref={camera.video} muted autoPlay playsInline hidden={camera.camera !== 'active'} className={camera.mirror ? 'mirror' : ''} aria-label="Jonli kamera tasviri" />
          <canvas ref={camera.canvas} hidden={!camera.overlay || camera.camera !== 'active'} className={camera.mirror ? 'mirror' : ''} aria-hidden="true" />
        </div>
        <div className="row">
          {camera.camera === 'idle'
            ? <button className="button primary" onClick={() => void camera.start()}><Camera size={18} /> Kamerani yoqish</button>
            : <button className="button secondary" onClick={() => camera.stop()}><CircleStop size={18} /> Kamerani o‘chirish</button>}

        </div>
        {camera.recognition !== 'ready' && <p className="hint" role="status">{readiness[camera.recognition]}</p>}
        {camera.status && <p role="alert" className="error">{camera.status}</p>}
        {camera.recognition === 'ready' && <div className="sign-status-box">
          <strong>{camera.candidate ? 'Dastlabki natija' : 'Ishoralar kuzatilmoqda'}</strong>
          <p>{camera.candidate ? <>{camera.candidate.text} · {Math.round(camera.candidate.confidence * 100)}%</> : 'Ishora aniqlanmadi'}</p>
        </div>}
      </section>

      <section className="panel stack sign-output-panel" aria-labelledby="sign-output-title">
        <div className="panel-heading sign-heading"><div className="row"><span className="tile lavender"><AudioLines size={22} /></span><h2 id="sign-output-title">O‘zbekcha matn</h2></div></div>
        <div>
          <label className="field" htmlFor="sign-transcript">Jonli matn</label>
          <textarea id="sign-transcript" className="sign-transcript" dir="auto" value={text} placeholder="Matn shu yerda ko‘rinadi. Qo‘lda ham yozishingiz mumkin."
            onChange={event => dispatch({ type: 'edit', value: event.target.value })}
            onKeyDown={event => {
              if (canUseText && !event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                setPresentation(text)
              }
            }} />
        </div>
        <div className="row">
          <button className="button primary" disabled={!canUseText} onClick={() => setPresentation(text)}><Expand size={18} /> Katta ekranda ko‘rsatish</button>
          {speech.speaking
            ? <button className="button secondary" onClick={speech.stop}><Square size={17} /> Ovozni to‘xtatish</button>
            : <button className="button secondary" disabled={!canUseText || !speech.supported} onClick={() => speech.speak(text, true)}><Volume2 size={18} /> {speech.supported && !speech.matching ? 'Standart ovozda o‘qish' : 'Ovoz chiqarib o‘qish'}</button>}
          <button className="button secondary" disabled={!canUseText} onClick={copy}><Copy size={17} /> Nusxalash</button>
          <button className="button secondary danger" disabled={!text && !tokens.length} onClick={() => dispatch({ type: 'clear' })}><Trash2 size={17} /> Tozalash</button>
        </div>
        <div className="row">
          <button className="button secondary" aria-pressed={paused} onClick={() => dispatch({ type: 'pause' })}>Avtomatik qo‘shishni to‘xtatish</button>
          <button className="button secondary" disabled={tokens.at(-1)?.before === undefined} onClick={() => dispatch({ type: 'undo' })}><RotateCcw size={17} /> Oxirgi ishorani bekor qilish</button>
          <button className="button secondary" disabled={!canUseText || !online || !!incoming} onClick={sendToStudio}><Send size={16} /> Muloqot studiyasiga o‘tkazish</button>
        </div>
        {!!incoming && <Link href="/muloqot" className="text-link">Kutilayotgan matnni studiyada ochish</Link>}
        {paused && <p role="status" className="hint">Avtomatik qo‘shish vaqtincha to‘xtatildi. Davom etish uchun tugmani yana bosing.</p>}
        {!online && <p className="hint">Matnni studiyaga o‘tkazish uchun internet kerak. Hozircha matnni nusxalashingiz mumkin.</p>}
        {speech.supported && !speech.matching && <p className="hint">Tanlangan til uchun ovoz topilmadi. Standart ovoz talaffuzda adashishi mumkin.</p>}
        {speech.supported === false && <p className="hint">Bu brauzerda ovozli o‘qish ishlamaydi. Matnni katta ekranda ko‘rsating.</p>}
        {speech.voiceError && <p role="alert" className="error">{speech.voiceError}</p>}
        <div className="sign-timeline">
          <h3>Tanilgan ishoralar</h3>
          {!tokens.length ? <p className="hint">Hozircha barqaror natija yo‘q.</p> : <ol className="sign-tokens">{tokens.map(token => <li key={token.key}>{token.text}</li>)}</ol>}
          <span className="sr-only" role="status">{tokens.length ? 'Matnga qo‘shildi: ' + tokens.at(-1)?.text : ''}</span>
        </div>
      </section>
      <section className="panel sign-camera-options" aria-label="Kamera sozlamalari va model holati">
        {camera.camera === 'active' && camera.devices.length > 1 && <label className="field">Kamerani tanlash
          <select value={camera.device} onChange={event => void camera.start(event.target.value)}>
            {camera.devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Kamera ' + (index + 1)}</option>)}
          </select>
        </label>}
        <p className="subtext">Kamera tasviri shu qurilmada tahlil qilinadi.</p>
        <label className="check-row"><input type="checkbox" checked={camera.overlay} onChange={event => camera.setOverlay(event.target.checked)} /> Qo‘l, yuz va tana nuqtalarini ko‘rsatish</label>
        <div className="sign-status-box">
          <div className="row"><ScanLine size={18} /><strong>Model holati</strong></div>
          {camera.recognition === 'ready' && <p role="status">{readiness.ready}</p>}
          {camera.recognition === 'unavailable' && <div>
            <p className="hint">UzSLR tadqiqoti 50 ta dinamik o‘zbek ishorasini hujjatlashtirgan. Modelni ulash uchun yangi foydalanuvchilarda alohida sinov kerak.</p>
            <a className="text-link" href="https://github.com/khdbeck/uzslr-sign-language-prototype/tree/9039de7c07768a66f70b8212f484b902cb5c261d">UzSLR tadqiqot manbasi</a>
          </div>}
          {camera.landmarker === 'loading' && <p className="hint">Tana va qo‘l nuqtalari modeli yuklanmoqda…</p>}
          {camera.landmarker === 'ready' && <p className="hint">Tana va qo‘l nuqtalari modeli tayyor.</p>}

        </div>
        <Link href="/kamera/tajriba" className="text-link"><FlaskConical size={18} /> Qo‘l shakllari tajribasini ochish</Link>
      </section>
    </div>
    <Dialog open={presentation !== null} onChange={open => { if (!open) setPresentation(null) }} title="Jonli matn" presentation><p className="transcript" dir="auto">{presentation}</p></Dialog>
  </div>
}
