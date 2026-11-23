'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, BookOpen, Copy, Expand, ListPlus, Mic, RotateCcw, Square, Trash2, Volume2 } from 'lucide-react'
import { addEntry, allPhrases, quick, languages, type Speaker } from '@/lib/core'
import { copyText, polishSpacing, useRecognition, useSpeech } from '@/lib/browser'
import { PageHeader, useSado } from './shell'
import { Dialog } from './ui/dialog'

export function Studio() {
  const { prefs, setPrefs, drafts, setDraft, append, incoming, setIncoming, cameraDrafts, setCameraDrafts, history, setHistory, setNotice } = useSado()
  const [speaker, setSpeaker] = useState<Speaker>('self')
  const [cameraDraftId, setCameraDraftId] = useState<string | null>(null)
  const cameraDraft = cameraDrafts.find(draft => draft.id === cameraDraftId)
  const [transfer, setTransfer] = useState(!!incoming)
  const [display, setDisplay] = useState<string | null>(null)
  const [possibleEdit, setPossibleEdit] = useState<{ source: string; result: string; speaker: Speaker; draftId?: string } | null>(null)
  const [clearHistory, setClearHistory] = useState(false)
  const [undo, setUndo] = useState<{ text: string; speaker: Speaker; draftId?: string } | null>(null)
  const importedPhrase = useRef(false)
  const editor = useRef<HTMLTextAreaElement>(null)
  const speech = useSpeech(prefs)
  const mic = useRecognition(prefs.language, text => append(text, 'partner'))
  const text = cameraDraft?.text ?? drafts[speaker]
  const usable = !!text.trim()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('javob')) setSpeaker('partner')
    const selected = allPhrases.find(phrase => phrase.id === params.get('ibora'))
    if (selected && !importedPhrase.current) {
      importedPhrase.current = true
      setDraft('self', selected.text)
      params.delete('ibora')
      const search = params.toString()
      window.history.replaceState(window.history.state, '', location.pathname + (search ? '?' + search : ''))
    }
  }, [setDraft])
  function changeSpeaker(next: Speaker) {
    setCameraDraftId(null)
    if (next !== speaker) { mic.cancel(); setSpeaker(next) }
  }
  function selectPhrase(phrase: string) {
    if (cameraDraft) edit(text ? text + '\n' + phrase : phrase)
    else append(phrase, speaker)
    editor.current?.focus()
  }
  function edit(value: string) {
    if (cameraDraft) setCameraDrafts(items => items.map(item => item.id === cameraDraft.id ? { ...item, text: value } : item))
    else setDraft(speaker, value)
  }
  function importCamera(mode: 'append' | 'replace' | 'separate') {
    if (!incoming.trim()) return
    changeSpeaker('self')
    if (mode === 'append') append(incoming)
    else if (mode === 'replace') setDraft('self', incoming)
    else {
      const id = crypto.randomUUID?.() ?? Date.now().toString()
      setCameraDrafts(items => [...items, { id, text: incoming }])
      setCameraDraftId(id)
    }
    setIncoming('')
    setTransfer(false)
    setNotice('Kamera matni qoralamaga o‘tkazildi.')
  }
  function save() {
    if (!usable) return
    const entry = { text, speaker, id: crypto.randomUUID?.() ?? Date.now() + '-' + Math.random() }
    setHistory(prev => addEntry(prev, entry))
    setNotice('Xabar suhbat tarixiga qo‘shildi.')
  }
  async function copy(value: string) {
    setNotice(await copyText(value) ? 'Matn nusxalandi.' : 'Nusxalab bo‘lmadi. Matnni belgilab, qo‘lda nusxalang.')
  }
  function clear() {
    mic.cancel()
    setUndo({ text, speaker, draftId: cameraDraft?.id })
    edit('')
    editor.current?.focus()
  }
  function format() {
    const result = polishSpacing(text)
    if (result === text) { setNotice('Oraliqlar joyida. Matn o‘zgarmadi.'); return }
    setPossibleEdit({ source: text, result, speaker, draftId: cameraDraft?.id })
  }

  return <div className="shell workspace">
    <PageHeader eyebrow="MULOQOT" title="Muloqot studiyasi" description="Xabar yozing, ovoz chiqarib o‘qing yoki suhbatdoshingizga katta ekranda ko‘rsating." />
    <div className="workspace-grid">
      <div className="stack">
        <section className="panel">
          <div className="segmented" role="group" aria-label="Kim yozmoqda?">
            <button aria-pressed={speaker === 'self' && !cameraDraft} onClick={() => changeSpeaker('self')}>Mening xabarim</button>
            <button aria-pressed={speaker === 'partner' && !cameraDraft} onClick={() => changeSpeaker('partner')}>Suhbatdosh javobi</button>
          </div>
          {!!incoming && <button className="button secondary" onClick={() => setTransfer(true)}>Kamera matnini olish</button>}
          {!!cameraDrafts.length && <label className="field">Alohida kamera qoralamalari
            <select value={cameraDraft?.id ?? ''} onChange={event => { changeSpeaker('self'); setCameraDraftId(event.target.value || null) }}>
              <option value="">Asosiy xabar</option>
              {cameraDrafts.map((draft, index) => <option key={draft.id} value={draft.id}>Kamera xabari {index + 1}</option>)}
            </select>
          </label>}
          <label className="field" htmlFor="message">{speaker === 'self' ? 'Xabar matni' : 'Javob matni'}</label>
          <textarea id="message" dir="auto" ref={editor} value={text} placeholder={speaker === 'self' ? 'Xabaringizni shu yerga yozing…' : 'Javobingizni shu yerga yozing…'}
            onChange={event => edit(event.target.value)}
            onKeyDown={event => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && usable && !event.nativeEvent.isComposing) { event.preventDefault(); setDisplay(text) }
            }} />
          <div className="actions"><button className="button primary" disabled={!usable} onClick={() => setDisplay(text)}><Expand size={18} /> Xabarni ko‘rsatish</button>
            {speech.speaking ? <button className="button secondary" onClick={speech.stop}><Square size={17} /> Ovozni to‘xtatish</button>
              : <button className="button secondary" disabled={!usable || !speech.matching} onClick={() => speech.speak(text)}><Volume2 size={18} /> Ovoz chiqarib o‘qish</button>}
          </div>
          {speech.supported === false ? <p className="hint">Bu brauzerda ovozli o‘qish ishlamaydi. Xabarni ekranda ko‘rsating.</p>
            : speech.supported && !speech.matching && <p className="hint">Qurilmada tanlangan til uchun ovoz topilmadi. Standart ovoz talaffuzda adashishi mumkin.</p>}
          {speech.supported && !speech.matching && !speech.speaking && <button className="button secondary" onClick={() => speech.speak(text, true)} disabled={!usable}><Volume2 size={17} /> Standart ovozda sinash</button>}
          {speech.voiceError && <p role="alert" className="error">{speech.voiceError}</p>}
          {speech.supported && <label className="field">O‘qish tezligi · {prefs.rate.toFixed(1)}× <input type="range" min=".5" max="1.5" step=".1" value={prefs.rate} onChange={event => setPrefs(prev => ({ ...prev, rate: Number(event.target.value) }))} /></label>}
          <div className="actions">
            <button className="button secondary" disabled={!usable} onClick={() => copy(text)}><Copy size={16} /> Nusxalash</button>
            <button className="button secondary" disabled={!usable} onClick={save}><ListPlus size={17} /> Tarixga qo‘shish</button>
            <button className="button secondary" disabled={!usable} onClick={format}>Oraliqlarni tekislash</button>
            <button className="button secondary danger" disabled={!text} onClick={clear}><Trash2 size={16} /> Tozalash</button>
            {undo?.speaker === speaker && undo.draftId === cameraDraft?.id && <button className="button secondary" disabled={!!text} onClick={() => { edit(undo.text); setUndo(null); editor.current?.focus() }}><RotateCcw size={16} /> Qaytarish</button>}
          </div>
          <p className="hint">Klaviaturada Ctrl yoki ⌘ + Enter tugmalari xabarni katta ekranda ochadi.</p>
        </section>
        {speaker === 'partner' && <section className="panel">
          <h2>Ovozni matnga aylantirish</h2>
          {mic.supported === null ? <p className="hint">Mikrofon imkoniyatlari tekshirilmoqda…</p> : !mic.supported ? <p role="status" className="notice-box">Bu brauzer ovozni matnga aylantirishni qo‘llamaydi. Javobni yuqoridagi maydonga yozing.</p>
            : <><p className="subtext">Til — {languages[prefs.language as keyof typeof languages]}. Brauzer ovozni tanish uchun uni o‘z xizmatiga yuborishi mumkin. Til va aniqlik qurilmaga bog‘liq.</p>
              {mic.state === 'idle' ? <button className="button secondary" onClick={mic.start}><Mic size={18} /> Mikrofonni yoqish</button>
                : <button className="button secondary" onClick={mic.state === 'loading' ? mic.cancel : mic.stop}><Square size={17} /> Tinglashni to‘xtatish</button>}
              <p role="status">{mic.state === 'loading' ? 'Mikrofon ishga tushmoqda…' : mic.state === 'listening' ? 'Tinglanmoqda…' : ''}</p>
              {mic.interim && <p className="transcript">{mic.interim}</p>}
              {mic.error && <p role="alert" className="error">{mic.error}</p>}
            </>}
        </section>}
        <section className="panel">
          <div className="panel-heading"><h2>Suhbat tarixi</h2>{!!history.length && <button className="button secondary danger" onClick={() => setClearHistory(true)}>Tarixni tozalash</button>}</div>
          <p className="subtext">{prefs.history ? 'Tarix shu brauzerda saqlanadi.' : 'Tarix faqat shu seansda ko‘rinadi.'} <Link className="text-link" href="/sozlamalar">Sozlamalar</Link></p>
          {!history.length ? <p className="notice-box">Hozircha tarix bo‘sh. Xabarni qo‘lda tarixga qo‘shishingiz mumkin.</p>
            : <ol className="timeline">{history.map(entry => <li key={entry.id}>
              <small>{entry.speaker === 'self' ? 'Siz' : 'Suhbatdosh'}</small><p>{entry.text}</p><div className="row">
              <button className="icon-button" title="Qoralamaga qo‘shish" aria-label="Qoralamaga qo‘shish" onClick={() => { changeSpeaker(entry.speaker); append(entry.text, entry.speaker); editor.current?.focus() }}><ArrowDownLeft size={17} /></button>
              <button className="icon-button" aria-label="Xabarni nusxalash" onClick={() => copy(entry.text)}><Copy size={17} /></button>
              <button className="icon-button danger" aria-label="Xabarni o‘chirish" onClick={() => setHistory(prev => prev.filter(item => item.id !== entry.id))}><Trash2 size={17} /></button>
            </div></li>)}</ol>}
        </section>
      </div>
      <aside className="panel stack">
        <div><h2>Tayyor iboralar</h2><p className="subtext">Iborani tanlang va kerak bo‘lsa tahrirlang.</p></div>
        <div className="chips">{quick.map(phrase => <button className="chip" key={phrase} onClick={() => selectPhrase(phrase)}>{phrase}</button>)}</div>
        <Link href="/iboralar" className="text-link"><BookOpen size={18} /> Barcha iboralarni ko‘rish</Link>
      </aside>
    </div>
    <Dialog open={transfer && !!incoming} onChange={setTransfer} title="Kameradan kelgan matn">
      <p>Mening xabarim qoralamasiga qo‘shing, uni almashtiring yoki alohida qoralama yarating.</p>
      <p className="notice-box transcript" dir="auto">{incoming}</p>
      <div className="actions">
        <button className="button primary" onClick={() => importCamera('append')}>Qoralamaga qo‘shish</button>
        <button className="button secondary" onClick={() => importCamera('separate')}>Alohida xabar yaratish</button>
        <button className="button secondary" onClick={() => importCamera('replace')}>Qoralamani almashtirish</button>
      </div>
    </Dialog>
    <Dialog open={display !== null} onChange={open => { if (!open) setDisplay(null) }} title="Xabar" presentation><p className="transcript" dir="auto">{display}</p></Dialog>
    <Dialog open={clearHistory} onChange={setClearHistory} title="Suhbat tarixini tozalash"><p>Barcha saqlangan xabarlar o‘chiriladi.</p><button className="button secondary danger" onClick={() => { setHistory([]); setClearHistory(false); setNotice('Suhbat tarixi tozalandi.') }}>Hammasini o‘chirish</button></Dialog>
    <Dialog open={possibleEdit !== null} onChange={open => { if (!open) setPossibleEdit(null) }} title="Oraliqlari tekislangan matn"><p>So‘zlar va tinish belgilari o‘z holicha qoladi.</p><p className="notice-box transcript">{possibleEdit?.result}</p>
      <button className="button primary" disabled={!possibleEdit?.result || speaker !== possibleEdit.speaker || cameraDraft?.id !== possibleEdit.draftId || text !== possibleEdit.source} onClick={() => { if (possibleEdit) edit(possibleEdit.result); setPossibleEdit(null) }}>Tahrirni qo‘llash</button>
    </Dialog>
  </div>
}
