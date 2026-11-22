'use client'
import { useEffect, useRef, useState } from 'react'
import type { HolisticLandmarker } from '@mediapipe/tasks-vision'
import { emptyGate, stabilize, type Landmarks, type Prediction } from '@/lib/sign-recognition'
import { signModelUrl, sampleInterval } from '@/lib/sign-vision'
import type { Preferences } from '@/lib/core'

type Run = { controller: AbortController; stream?: MediaStream; landmarker?: HolisticLandmarker; frame: number; timer?: number }
type Camera = 'idle' | 'permission' | 'active'
type Landmarker = 'idle' | 'loading' | 'ready' | 'error'
type Recognition = 'unavailable' | 'waiting' | 'loading' | 'ready' | 'error'

function dispose(run: Run | null) {
  if (!run) return
  run.controller.abort()
  clearTimeout(run.timer)
  cancelAnimationFrame(run.frame)
  run.stream?.getTracks().forEach(track => track.stop())
  run.landmarker?.close()
}
function draw(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, result?: Landmarks) {
  if (!canvas) return
  const { videoWidth: width, videoHeight: height } = video
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  if (!result) return
  const groups = [
    { color: '#d6f67b', points: [...result.leftHandLandmarks, ...result.rightHandLandmarks], size: 3 },
    { color: '#a3d9ff', points: result.poseLandmarks.filter((point, i) => i <= 24 && (point.visibility ?? 1) >= .5), size: 3 },
    { color: '#fff', points: result.faceLandmarks, size: 1 },
  ]
  for (const { color, points, size } of groups) {
    ctx.fillStyle = color
    ctx.beginPath()
    for (const point of points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
      const x = point.x * width
      const y = point.y * height
      ctx.moveTo(x + size, y)
      ctx.arc(x, y, size, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

export function useSignCamera(preferred: Preferences['camera'], onSign: (prediction: Prediction) => void) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const runRef = useRef<Run | null>(null)
  const commit = useRef(onSign)
  const overlayRef = useRef(false)
  const [camera, setCamera] = useState<Camera>('idle')
  const [landmarker, setLandmarker] = useState<Landmarker>('idle')
  const [recognition, setRecognition] = useState<Recognition>(signModelUrl ? 'waiting' : 'unavailable')
  const [candidate, setCandidate] = useState<Prediction | null>(null)
  const [status, setStatus] = useState('')
  const [device, setDevice] = useState('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [overlay, setOverlay] = useState(false)
  const [mirror, setMirror] = useState(preferred === 'user')
  useEffect(() => { commit.current = onSign }, [onSign])
  useEffect(() => { overlayRef.current = overlay }, [overlay])
  useEffect(() => {
    function cleanup() {
      const current = runRef.current
      runRef.current = null
      dispose(current)
    }
    function onPageHide() { stop() }
    window.addEventListener('pagehide', onPageHide)
    return () => { window.removeEventListener('pagehide', onPageHide); cleanup() }
  }, [])

  function stop(message = '') {
    const current = runRef.current
    runRef.current = null
    dispose(current)
    if (video.current) {
      video.current.srcObject = null
      draw(canvas.current, video.current)
    }
    setCamera('idle')
    setLandmarker('idle')
    setRecognition(signModelUrl ? 'waiting' : 'unavailable')
    setCandidate(null)
    setStatus(message)
  }

  async function start(selected = device) {
    stop()
    const element = video.current
    if (!element || !isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('Kamera ishlashi uchun HTTPS yoki kamerani qo‘llaydigan brauzer kerak.')
      return
    }
    const run: Run = { controller: new AbortController(), frame: 0 }
    runRef.current = run
    setCamera('permission')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(selected ? { deviceId: { exact: selected } } : { facingMode: { ideal: preferred } }),
          width: { ideal: 640 }, height: { ideal: 480 },
        },
        audio: false,
      })
      if (runRef.current !== run) { stream.getTracks().forEach(track => track.stop()); return }
      run.stream = stream
      const track = stream.getVideoTracks()[0]
      track.addEventListener('ended', () => { if (runRef.current === run) stop('Kamera aloqasi uzildi.') }, { once: true })
      const settings = track.getSettings()
      setDevice(settings.deviceId || selected)
      setMirror((settings.facingMode || preferred) === 'user')
      element.srcObject = stream
      await element.play()
      if (runRef.current !== run) return
      setCamera('active')
      navigator.mediaDevices.enumerateDevices().then(items => {
        if (runRef.current === run) setDevices(items.filter(item => item.kind === 'videoinput'))
      }).catch(() => {})
    } catch (error) {
      if (runRef.current !== run) return
      const code = error instanceof DOMException ? error.name : ''
      stop(code === 'NotAllowedError' || code === 'SecurityError'
        ? 'Kameraga ruxsat berilmadi. Brauzer ruxsatlarini tekshiring.'
        : code === 'NotFoundError' || code === 'OverconstrainedError'
          ? 'Kamera topilmadi. Qurilmani tekshiring yoki boshqa kamerani tanlang.'
          : 'Kamera ishga tushmadi. Qayta urinib ko‘ring.')
      return
    }

    setLandmarker('loading')
    if (signModelUrl) setRecognition('loading')
    try {
      const runtime = await import('@/lib/sign-vision')
      if (runRef.current !== run) return
      const { signal } = run.controller
      run.timer = window.setTimeout(() => run.controller.abort(), 20_000)
      // The landmark preview can run independently of the optional language model.
      const modelResult = runtime.loadSignModel(signal).catch(() => null)
      const tracker = await runtime.createLandmarker(signal)
      if (runRef.current !== run) { tracker.close(); return }
      run.landmarker = tracker
      setLandmarker('ready')
      const model = await modelResult
      if (runRef.current !== run) return
      clearTimeout(run.timer)
      setRecognition(model ? 'ready' : signModelUrl ? 'error' : 'unavailable')
      const sequence = model ? runtime.createSequenceReader(model) : null
      let gate = emptyGate
      let last = 0
      let lastMediaTime = -1
      let previous: Prediction | null = null

      function publish(next: Prediction | null) {
        if (previous?.id !== next?.id || Math.round((previous?.confidence ?? 0) * 100) !== Math.round((next?.confidence ?? 0) * 100)) {
          setCandidate(next)
          previous = next
        }
      }

      function tick(now: number) {
        if (runRef.current !== run || !element) return
        const gap = now - last
        if (last && gap > 450) {
          // Skip a broken temporal window. Keep the last committed ID latched.
          sequence?.reset()
          gate = { ...gate, candidate: null, count: 0, quiet: 0 }
          publish(null)
          draw(canvas.current, element)
          last = 0
        }
        if (!document.hidden && (sequence || overlayRef.current) && gap >= sampleInterval &&
            element.readyState >= 2 && element.currentTime !== lastMediaTime) {
          try {
            last = now
            lastMediaTime = element.currentTime
            tracker.detectForVideo(element, now, result => {
              const landmarks = {
                leftHandLandmarks: result.leftHandLandmarks[0] ?? [],
                rightHandLandmarks: result.rightHandLandmarks[0] ?? [],
                poseLandmarks: result.poseLandmarks[0] ?? [],
                faceLandmarks: result.faceLandmarks[0] ?? [],
              }
              draw(canvas.current, element, overlayRef.current ? landmarks : undefined)
              if (!sequence || !model) return
              const prediction = sequence.predict(landmarks, element.videoWidth / element.videoHeight)
              publish(prediction)
              const update = stabilize(gate, prediction, model.policy)
              gate = update.gate
              if (update.committed) commit.current(update.committed)
            })
          } catch {
            sequence?.reset()
            publish(null)
            run.landmarker = undefined
            tracker.close()
            draw(canvas.current, element)
            setLandmarker('error')
            if (signModelUrl) setRecognition('error')
            setStatus('Tahlil uzildi. Qayta boshlash uchun kamerani o‘chirib yoqing.')
            return
          }
        }
        run.frame = requestAnimationFrame(tick)
      }
      run.frame = requestAnimationFrame(tick)
    } catch {
      if (runRef.current !== run) return
      run.controller.abort()
      clearTimeout(run.timer)
      setLandmarker('error')
      if (signModelUrl) setRecognition('error')
      setStatus('Tana va qo‘l nuqtalari modeli yuklanmadi. Kamera tasviri ochiq, matnni qo‘lda yozish mumkin.')
    }
  }

  function switchCamera() {
    const index = devices.findIndex(item => item.deviceId === device)
    const next = devices[(index + 1) % devices.length]
    if (next) void start(next.deviceId)
  }
  return { video, canvas, camera, landmarker, recognition, candidate, status, devices, overlay, setOverlay, mirror, start, stop, switchCamera }
}
