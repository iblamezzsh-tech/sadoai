'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AudioLines, Camera, CircleStop, Copy, Expand, FlaskConical, RefreshCw, ScanLine, Square, Trash2, VideoOff, Volume2 } from 'lucide-react'
import { copyText, useSpeech } from '@/lib/browser'
import type { Prediction } from '@/lib/sign-recognition'
import { PageHeader, useSado } from './shell'
import { Dialog } from './ui/dialog'
import { useSignCamera } from './use-sign-camera'

type Token = Prediction & { key: string }
const readiness = {
  unavailable: 'Tasdiqlangan o‘zbek ishora tili modeli hali ulanmagan.',
  waiting: 'Model kamera yoqilganda tekshiriladi.',
  loading: 'Ishora tili modeli yuklanmoqda…',
  ready: 'Ishora tili modeli tayyor.',
  error: 'Ishora tili modelini ishga tushirib bo‘lmadi.',
}
export function SignStudio() {
  const { prefs, setNotice } = useSado()
  const [text, setText] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [presentation, setPresentation] = useState<string | null>(null)
  const speech = useSpeech(prefs)
  const camera = useSignCamera(prefs.camera, prediction => {
    setText(current => current.trimEnd() ? current.trimEnd() + ' ' + prediction.text : prediction.text)
    const token = { ...prediction, key: crypto.randomUUID() }
    setTokens(current => [...current.slice(-99), token])
  })
  const canUseText = !!text.trim()

  async function copy() {
    setNotice(await copyText(text) ? 'Matn nusxalandi.' : 'Nusxalab bo‘lmadi. Matnni belgilab, qo‘lda nusxalang.')
  }

  return <div className="shell workspace">
    <PageHeader eyebrow="KAMERA ORQALI MULOQOT" title="Ishoradan matnga" description="Ishoralardan hosil bo‘lgan o‘zbekcha matnni o‘qing, tahrirlang yoki ovoz chiqarib o‘qing." />
    <div className="sign-grid">
      <section className="panel stack" aria-labelledby="sign-camera-title">
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
          {camera.devices.length > 1 && camera.camera === 'active' && <button className="button secondary" onClick={camera.switchCamera}><RefreshCw size={17} /> Kamerani almashtirish</button>}
        </div>
        <p className="subtext">Kamera tasviri shu qurilmada tahlil qilinadi.</p>
        <label className="check-row"><input type="checkbox" checked={camera.overlay} onChange={event => camera.setOverlay(event.target.checked)} /> Qo‘l, yuz va tana nuqtalarini ko‘rsatish</label>
        <div className="sign-status-box">
          <div className="row"><ScanLine size={18} /><strong>Model holati</strong></div>
          <p role="status">{readiness[camera.recognition]}</p>
          {camera.landmarker === 'loading' && <p className="hint">Tana va qo‘l nuqtalari modeli yuklanmoqda…</p>}
          {camera.landmarker === 'ready' && <p className="hint">Tana va qo‘l nuqtalari modeli tayyor.</p>}
          {camera.status && <p role="alert" className="error">{camera.status}</p>}
        </div>
        {camera.recognition === 'ready' && <div className="sign-status-box">
          <strong>Dastlabki natija</strong>
          <p>{camera.candidate ? <>{camera.candidate.text} · {Math.round(camera.candidate.confidence * 100)}%</> : 'Ishora aniqlanmadi'}</p>
          <p className="hint">Barqaror natija matnga avtomatik qo‘shiladi.</p>
        </div>}
        <Link href="/kamera/tajriba" className="text-link"><FlaskConical size={18} /> Qo‘l shakllari tajribasini ochish</Link>
      </section>

      <section className="panel stack" aria-labelledby="sign-output-title">
        <div className="panel-heading sign-heading"><div className="row"><span className="tile lavender"><AudioLines size={22} /></span><h2 id="sign-output-title">O‘zbekcha matn</h2></div></div>
        <div>
          <label className="field" htmlFor="sign-transcript">Jonli matn</label>
          <textarea id="sign-transcript" className="sign-transcript" dir="auto" value={text} placeholder="Matn shu yerda ko‘rinadi. Qo‘lda ham yozishingiz mumkin."
            onChange={event => setText(event.target.value)}
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
          <button className="button secondary danger" disabled={!text && !tokens.length} onClick={() => { setText(''); setTokens([]) }}><Trash2 size={17} /> Tozalash</button>
        </div>
        {speech.supported && !speech.matching && <p className="hint">Tanlangan til uchun ovoz topilmadi. Standart ovoz talaffuzda adashishi mumkin.</p>}
        {!speech.supported && <p className="hint">Bu brauzerda ovozli o‘qish ishlamaydi. Matnni katta ekranda ko‘rsating.</p>}
        {speech.voiceError && <p role="alert" className="error">{speech.voiceError}</p>}
        <div className="sign-timeline">
          <h3>Tanilgan ishoralar</h3>
          {!tokens.length ? <p className="hint">Hozircha barqaror natija yo‘q.</p> : <ol className="sign-tokens">{tokens.map(token => <li key={token.key}>{token.text}</li>)}</ol>}
          <span className="sr-only" role="status">{tokens.length ? 'Matnga qo‘shildi: ' + tokens.at(-1)?.text : ''}</span>
        </div>
      </section>
    </div>
    <Dialog open={presentation !== null} onChange={open => { if (!open) setPresentation(null) }} title="Jonli matn" presentation><p className="transcript" dir="auto">{presentation}</p></Dialog>
  </div>
}
