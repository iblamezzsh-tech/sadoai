'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { GestureRecognizer, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { Camera, Check, CircleStop, RefreshCw, RotateCcw, ScanLine, Send, TriangleAlert, VideoOff, X } from 'lucide-react'
import { confirmGesture, gestureLabels, holdFrames, observeGesture, type Candidate, type Gesture } from '@/lib/core'
import { observeShortcut, shortcutLimit } from '@/lib/gesture-shortcuts'
import { emptyGate } from '@/lib/sign-recognition'
import { copyText } from '@/lib/browser'
import { PageHeader, useSado } from './shell'

type Run = { stream?: MediaStream; model?: GestureRecognizer; frame: number; controller: AbortController }
type Phase = 'idle' | 'permission' | 'loading' | 'ready' | 'error'
const unclear = 'Ishora aniq tanilmadi. Qayta urinib ko‘ring.'
const connections = [[0,1,2,3,4], [0,5,6,7,8], [5,9,10,11,12], [9,13,14,15,16], [13,17,18,19,20], [17,0]]

function release(run: Run | null) {
  if (!run) return
  run.controller.abort()
  cancelAnimationFrame(run.frame)
  run.stream?.getTracks().forEach(track => track.stop())
  run.model?.close()
}
function draw(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, points: NormalizedLandmark[] | undefined, enabled: boolean) {
  if (!canvas) return
  if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
  if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)
  if (!enabled || points?.length !== 21) return
  ctx.strokeStyle = '#d6f67b'
  ctx.lineWidth = 3
  for (const path of connections) {
    ctx.beginPath()
    path.forEach((index, i) => {
      const { x, y } = points[index]
      if (!i) ctx.moveTo(x * width, y * height)
      else ctx.lineTo(x * width, y * height)
    })
    ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  for (const { x, y } of points) {
    ctx.beginPath(); ctx.arc(x * width, y * height, 3, 0, 2 * Math.PI); ctx.fill()
  }
}
export function CameraLab() {
  const { prefs, append, setNotice, shortcuts, setShortcuts, incoming, setIncoming, online } = useSado()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [mirror, setMirror] = useState(true)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [device, setDevice] = useState('')
  const [landmarks, setLandmarks] = useState(false)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [confirmed, setConfirmed] = useState('')
  const [shortcut, setShortcut] = useState<Gesture>('Open_Palm')
  const [phrase, setPhrase] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)
  const [output, setOutput] = useState({ text: '', undo: null as string | null })
  const [announced, setAnnounced] = useState('')
  const shortcutSettings = useRef({ armed, shortcuts })
  const gate = useRef(emptyGate)
  const mapped = Object.keys(shortcuts).length > 0
  const configuredPhrase = shortcuts[shortcut] ?? ''
  const editedPhrase = phrase ?? configuredPhrase
  useEffect(() => {
    shortcutSettings.current = { armed: armed && mapped, shortcuts }
    gate.current = emptyGate
    if (!mapped) setArmed(false)
  }, [armed, mapped, shortcuts])
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const running = useRef<Run | null>(null)
  const show = useRef(false)
  const blocked = useRef<string | null>(null)
  const lastObservation = useRef(0)
  const activeCandidate = useRef<Candidate | null>(null)
  useEffect(() => { show.current = landmarks }, [landmarks])
  useEffect(() => () => { const run = running.current; running.current = null; release(run) }, [])

  function reset(next: Phase = 'idle', message = '') {
    const run = running.current
    running.current = null
    release(run)
    if (video.current) video.current.srcObject = null
    setPhase(next)
    setError(message)
    setPreview(false)
    setCandidate(null)
    activeCandidate.current = null
    setConfirmed('')
    blocked.current = null
    gate.current = emptyGate
  }
  async function start(selected = device) {
    reset()
    const element = video.current
    if (!element || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      reset('error', 'Bu brauzerda kamera ishlamaydi. HTTPS orqali oching yoki boshqa brauzerda sinab ko‘ring.')
      return
    }
    const run: Run = { frame: 0, controller: new AbortController() }
    running.current = run
    setPhase('permission')
    let loadingModel = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {
        ...(selected ? { deviceId: { exact: selected } } : { facingMode: { ideal: prefs.camera } }),
        width: { ideal: 640 }, height: { ideal: 480 },
      }, audio: false })
      if (running.current !== run) { stream.getTracks().forEach(track => track.stop()); return }
      run.stream = stream
      const track = stream.getVideoTracks()[0]
      track.addEventListener('ended', () => { if (running.current === run) reset('error', 'Kamera aloqasi uzildi. Kamerani yana yoqing.') }, { once: true })
      const settings = track.getSettings()
      setMirror((settings.facingMode || prefs.camera) === 'user')
      setDevice(settings.deviceId || selected)
      element.srcObject = stream
      setPreview(true)
      await element.play()
      if (running.current !== run) return
      navigator.mediaDevices.enumerateDevices().then(items => {
        if (running.current === run) setDevices(items.filter(item => item.kind === 'videoinput'))
      }).catch(() => {})
      loadingModel = true
      setPhase('loading')
      const { createRecognizer } = await import('@/lib/vision')
      if (running.current !== run) return
      const timeout = window.setTimeout(() => run.controller.abort(), 20000)
      try {
        const recognizer = await createRecognizer(run.controller.signal)
        if (running.current !== run) { recognizer.close(); return }
        run.model = recognizer
        if (run.controller.signal.aborted) throw new Error('Model timed out')
      } finally { clearTimeout(timeout) }
      setPhase('ready')
      let last = 0
      let lastVideoTime = -1
      let previous: Candidate | null = null
      function sample(now: number) {
        if (running.current !== run || !run.model || !element) return
        if (last && now - last > 500) {
          gate.current = { ...gate.current, candidate: null, count: 0, quiet: 0 }
          previous = null
          activeCandidate.current = null
          setCandidate(null)
          draw(canvas.current, element, undefined, false)
          last = 0
        }
        if (!document.hidden && now - last >= 110 && element.readyState >= 2 && element.currentTime !== lastVideoTime) {
          last = now
          lastVideoTime = element.currentTime
          try {
            const prediction = run.model.recognizeForVideo(element, now)
            const top = prediction.gestures[0]?.[0]
            const settings = shortcutSettings.current
            if (settings.armed) {
              const result = observeShortcut(gate.current, top?.categoryName ?? '', top?.score ?? 0, settings.shortcuts)
              gate.current = result.gate
              const text = result.text
              if (text) {
                setOutput(current => ({ text: current.text.trimEnd() ? current.text.trimEnd() + '\n' + text : text, undo: current.text }))
                setAnnounced('Qo‘shildi: ' + text)
              }
            }
            if (top?.categoryName !== blocked.current) blocked.current = null
            const next = blocked.current ? null : observeGesture(previous, top?.categoryName ?? '', top?.score ?? 0)
            if (next || previous) setCandidate(next)
            activeCandidate.current = next
            lastObservation.current = now
            previous = next
            draw(canvas.current, element, prediction.landmarks[0], show.current)
          } catch {
            reset('error', 'Qo‘l shaklini tahlil qilib bo‘lmadi. Kamerani qayta yoqing.')
            return
          }
        }
        run.frame = requestAnimationFrame(sample)
      }
      run.frame = requestAnimationFrame(sample)
    } catch (problem) {
      if (running.current !== run) return
      const code = problem instanceof DOMException ? problem.name : ''
      reset('error', loadingModel ? 'Ishora modeli yuklanmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.'
        : code === 'NotAllowedError' || code === 'SecurityError' ? 'Kameraga ruxsat berilmadi. Brauzer ruxsatlarini tekshirib, qayta urinib ko‘ring.'
        : code === 'NotFoundError' || code === 'OverconstrainedError' ? 'Kamera topilmadi. Boshqa kamerani tanlang yoki qurilmani tekshiring.'
        : 'Kamera ishga tushmadi. Kameradan foydalanayotgan boshqa ilovani yoping va qayta urinib ko‘ring.')
    }
  }
  function saveShortcut() {
    const text = editedPhrase.trim()
    if (!text || text.length > shortcutLimit) return
    setShortcuts(current => ({ ...current, [shortcut]: text }))
    setPhrase(null)
    setNotice('Shaxsiy qisqa buyruq saqlandi.')
  }
  function removeShortcut() {
    setShortcuts(current => {
      const next = { ...current }
      delete next[shortcut]
      return next
    })
    setPhrase(null)
    setNotice('Shaxsiy qisqa buyruq o‘chirildi.')
  }
  function reject() {
    blocked.current = activeCandidate.current?.name ?? null
    activeCandidate.current = null
    setCandidate(null)
    setConfirmed('')
  }

  return <div className="shell workspace">
    <PageHeader eyebrow="TAJRIBA" title="Qo‘l harakatlari tajribasi" description="Kamera yordamida ayrim qo‘l harakatlarini aniqlashni sinab ko‘ring." />
    <div className="workspace-grid">
      <section className="panel">
        <div className="panel-heading"><h2>Kamera tasviri</h2><ScanLine size={20} /></div>
        <div className="camera-view">
          {!preview && <div className="camera-idle"><VideoOff size={30} />Kamera o‘chiq</div>}
          <video ref={video} autoPlay muted playsInline hidden={!preview} className={mirror ? 'mirror' : ''} aria-label="Jonli kamera tasviri" />
          <canvas ref={canvas} hidden={!preview || !landmarks} className={mirror ? 'mirror' : ''} aria-hidden="true" />
        </div>
        <p className="subtext">Kamera qo‘l shaklini topish uchun kerak. Tasvir qurilmangizda tahlil qilinadi.</p>
        <div className="actions">
          {phase === 'idle' || phase === 'error' ? <button className="button primary" onClick={() => start()}><Camera size={18} /> Kamerani yoqish</button>
            : <button className="button secondary" onClick={() => reset()}><CircleStop size={18} /> Kamerani o‘chirish</button>}
          {devices.length > 1 && <button className="button secondary" onClick={() => start(devices[(devices.findIndex(item => item.deviceId === device) + 1) % devices.length].deviceId)}><RefreshCw size={17} /> Kamerani almashtirish</button>}
        </div>
        <label className="check-row"><input type="checkbox" checked={landmarks} onChange={event => setLandmarks(event.target.checked)} /> Qo‘l nuqtalarini ko‘rsatish</label>
        {error && <p role="alert" className="error notice-box">{error}</p>}
      </section>
      <div className="stack">
        <section className="panel">
          <h2>Aniqlash natijasi</h2>
          <p role="status" className="notice-box">{phase === 'permission' ? 'Kameraga ruxsat kutilmoqda…' : phase === 'loading' ? 'Ishora modeli yuklanmoqda…' : phase !== 'ready' ? 'Boshlash uchun kamerani yoqing.' : candidate ? (confirmGesture(candidate) ? 'Tasdiqlash mumkin.' : 'Qo‘lingizni shu holatda ushlab turing.') : unclear}</p>
          {candidate && <>
            <p><strong>{gestureLabels[candidate.name]}</strong> <small>({candidate.name})</small></p>
            <label className="field">Model ishonchi · {Math.round(candidate.score * 100)}% <meter min={0} max={1} value={candidate.score} /></label>
            <label className="field">Barqarorlik <progress value={candidate.frames} max={holdFrames} /></label>
            <div className="actions"><button className="button primary" disabled={!confirmGesture(candidate)} onClick={() => {
              const label = performance.now() - lastObservation.current <= 500 ? confirmGesture(activeCandidate.current) : null
              if (label) setConfirmed(label)
            }}><Check size={18} /> Tasdiqlash</button><button className="button secondary" onClick={reject}><X size={18} /> Rad etish</button></div>
          </>}
          {confirmed && <div><p><strong>Tasdiqlangan qo‘l shakli</strong><br />{confirmed}</p><div className="actions"><button className="button primary" onClick={() => { append(confirmed); setNotice('Tasdiqlangan qo‘l shakli qoralamaga qo‘shildi.'); router.push('/muloqot') }}>Xabarga qo‘shish</button><button className="button secondary" onClick={reject}>Natijani tozalash</button></div></div>}
        </section>
        <section className="panel stack" aria-labelledby="shortcut-title">
          <div><h2 id="shortcut-title">Shaxsiy imo buyruqlari</h2><p>Qo‘l shakliga o‘zingiz matn biriktiring. Bu sizning shaxsiy buyrug‘ingiz. O‘zbek ishora tili tarjimasi uchun alohida model kerak.</p></div>
          <label className="field">Qo‘l shakli<select value={shortcut} onChange={event => { setShortcut(event.target.value as Gesture); setPhrase(null) }}>
            {Object.entries(gestureLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label className="field">Biriktiriladigan matn<input className="text-input" type="text" maxLength={shortcutLimit} value={editedPhrase} onChange={event => setPhrase(event.target.value)} /></label>
          <div className="row">
            <button className="button secondary" disabled={!editedPhrase.trim() || editedPhrase.trim() === configuredPhrase} onClick={saveShortcut}>Buyruqni saqlash</button>
            <button className="button secondary danger" disabled={!configuredPhrase} onClick={removeShortcut}>Buyruqni o‘chirish</button>
          </div>
          <label className="check-row"><input type="checkbox" checked={armed} disabled={!mapped} onChange={event => setArmed(event.target.checked)} /> Tanishda matnni avtomatik qo‘shish</label>
          <p className="hint">{armed ? 'Model kamida 82% ishonch bilan barqaror qo‘l shaklini topsa, siz biriktirgan matn qo‘shiladi.' : 'Avtomatik qo‘shish uchun avval buyruq saqlang va ushbu rejimni yoqing.'}</p>
          <label className="field">Buyruqlardan yig‘ilgan matn<textarea value={output.text} onChange={event => setOutput({ text: event.target.value, undo: null })} placeholder="Matn shu yerda chiqadi." /></label>
          <p className="sr-only" role="status">{announced}</p>
          <div className="row">
            <button className="button secondary" disabled={output.undo === null} onClick={() => setOutput({ text: output.undo ?? '', undo: null })}><RotateCcw size={16} /> Qaytarish</button>
            <button className="button secondary" disabled={!output.text.trim()} onClick={async () => setNotice(await copyText(output.text) ? 'Matn nusxalandi.' : 'Matnni belgilab, qo‘lda nusxalang.')}>Nusxalash</button>
            <button className="button secondary" disabled={!output.text} onClick={() => { setOutput({ text: '', undo: null }); setAnnounced('') }}>Tozalash</button>
            <button className="button primary" disabled={!output.text.trim() || !online || !!incoming} onClick={() => { setIncoming(output.text); router.push('/muloqot') }}><Send size={16} /> Studiyaga o‘tkazish</button>
          </div>
          {!!incoming && <Link href="/muloqot" className="text-link">Kutilayotgan matnni studiyada ochish</Link>}
        </section>
        <Link href="/kamera" className="text-link">Ishoradan matnga sahifasiga qaytish</Link>
        <section className="panel"><div className="row"><TriangleAlert size={19} /><h2>Tajriba chegaralari</h2></div><p>Model faqat cheklangan qo‘l shakllarini ajratadi. O‘zbek ishora tilini tarjima qilish uchun alohida tekshirilgan model kerak.</p><div className="chips">{Object.values(gestureLabels).map(label => <span className="hint" key={label}>{label}</span>)}</div></section>
      </div>
    </div>
  </div>
}
