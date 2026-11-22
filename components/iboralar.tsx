'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowUpRight, Copy, Heart, Plus, Square, Volume2 } from 'lucide-react'
import { allPhrases, categories, phraseGroups } from '@/lib/core'
import { copyText, useSpeech } from '@/lib/browser'
import { PageHeader, useSado } from './shell'
import { Dialog } from './ui/dialog'

function searchable(text: string) {
  return text.toLocaleLowerCase('uz').normalize('NFC').replace(/[‘’ʻʼ`']/g, '')
}
export function Phrasebook() {
  const { prefs, favorites, setFavorites, append, setNotice } = useSado()
  const speech = useSpeech(prefs)
  const [category, setCategory] = useState('Barchasi')
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [selection, setSelection] = useState('')
  const router = useRouter()
  const phrases = allPhrases.filter(item => (category === 'Barchasi' || item.category === category)
    && (!onlyFavorites || favorites.includes(item.text)) && searchable(item.text).includes(searchable(query.trim())))
  function usePhrase(text: string) {
    if (!navigator.onLine) {
      const phrase = allPhrases.find(item => item.text === text)
      if (phrase) window.location.assign('/muloqot?ibora=' + phrase.id)
      return
    }
    append(text)
    setNotice('Ibora qoralamaga qo‘shildi.')
    router.push('/muloqot')
  }
  async function copy(phrase: string) {
    setNotice(await copyText(phrase) ? 'Ibora nusxalandi.' : 'Nusxalab bo‘lmadi. Matnni belgilab, qo‘lda nusxalang.')
  }
  return <div className="shell workspace">
    <PageHeader eyebrow="IBORALAR" title="Iboralar kitobi" description="Kundalik vaziyatlarga mos iborani toping, ovozli o‘qing yoki xabaringizga qo‘shing." />
    <section className="panel sos">
      <div className="panel-heading"><div className="row"><AlertCircle size={22} /><h2>Shoshilinch yordam</h2></div><button className="button secondary danger" onClick={() => { setSelection(''); setEmergency(true) }}>SOS iboralarini ochish <ArrowUpRight size={17} /></button></div>
      <p className="subtext">Yordam so‘rash uchun suhbatdoshingizga tayyor xabarni ko‘rsating.</p>
    </section>
    <div className="phrase-toolbar">
      <label className="field">Iborani qidirish <input type="search" placeholder="Masalan, rahmat" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="chips" role="group" aria-label="Ibora turkumlari">{['Barchasi', ...categories].map(item => <button key={item} className="chip" aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="row"><button className="button secondary" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}><Heart size={18} fill={onlyFavorites ? 'currentColor' : 'none'} /> {onlyFavorites ? 'Faqat saralanganlar' : 'Saralanganlar'}</button>
        {speech.speaking && <button className="button secondary" onClick={speech.stop}><Square size={16} /> Ovozni to‘xtatish</button>}</div>
      {(!speech.supported || !speech.matching) && <p className="hint">{!speech.supported ? 'Bu brauzerda ovozli o‘qish ishlamaydi.' : 'Tanlangan tilda ovoz topilmadi. Iborani o‘qishda qurilmaning standart ovozi ishlatiladi.'}</p>}
      {speech.voiceError && <p className="error" role="alert">{speech.voiceError}</p>}
      <p className="hint" role="status">{phrases.length} ta ibora</p>
    </div>
    {phrases.length ? <div className="phrase-grid">{phrases.map(({ text, category: group }) => <article className="panel" key={text}>
      <span className="hint">{group}</span><h2 className="phrase-text">{text}</h2>
      <div className="actions">
        <button className="icon-button" aria-label="Iborani o‘qish" disabled={!speech.supported} onClick={() => speech.speak(text, true)}><Volume2 size={18} /></button>
        <button className="icon-button" aria-label="Iborani nusxalash" onClick={() => copy(text)}><Copy size={17} /></button>
        <button className="icon-button" aria-label="Saralangan ibora" aria-pressed={favorites.includes(text)} onClick={() => setFavorites(items => items.includes(text) ? items.filter(item => item !== text) : [...items, text])}><Heart size={18} fill={favorites.includes(text) ? 'currentColor' : 'none'} /></button>
        <button className="button secondary" aria-label="Xabarga qo‘shish" onClick={() => usePhrase(text)}><Plus size={17} /> Qo‘shish</button>
      </div>
    </article>)}</div> : <p className="notice-box">Ibora topilmadi. Qidiruv yoki filtrlarni o‘zgartiring.</p>}
    <Dialog open={emergency} onChange={setEmergency} title="Shoshilinch xabar">
      <p>Kerakli iborani tanlang. Xabarni qoralamadan ko‘rsatishingiz mumkin. Favqulodda xizmatlarga xabar yuborilmaydi.</p>
      <div className="chips">{phraseGroups[7].map(text => <button key={text} className="chip" aria-pressed={selection === text} onClick={() => setSelection(text)}>{text}</button>)}</div>
      <div className="actions"><button className="button primary" disabled={!selection} onClick={() => { setEmergency(false); usePhrase(selection) }}>Xabarga qo‘shish</button></div>
    </Dialog>
  </div>
}
