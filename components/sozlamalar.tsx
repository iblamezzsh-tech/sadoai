'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { languages, type Preferences } from '@/lib/core'
import { PageHeader, useSado } from './shell'
import { Dialog } from './ui/dialog'

export function Settings() {
  const { prefs, setPrefs, clearData } = useSado()
  const [confirm, setConfirm] = useState(false)
  function change<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs(current => ({ ...current, [key]: value }))
  }
  return <div className="shell workspace">
    <PageHeader eyebrow="SOZLAMALAR" title="Sozlamalar" description="SadoAI ko‘rinishi va ishlashini o‘zingizga moslang." />
    <div className="settings-grid">
      <section className="panel"><h2>Ko‘rinish</h2>
        <label className="field">Rang mavzusi<select value={prefs.theme} onChange={event => change('theme', event.target.value as Preferences['theme'])}><option value="system">Qurilma sozlamasi</option><option value="light">Yorug‘</option><option value="dark">Qorong‘i</option></select></label>
        <label className="field">Matn o‘lchami<select value={prefs.font} onChange={event => change('font', event.target.value as Preferences['font'])}><option value="standard">Odatiy</option><option value="large">Katta</option><option value="extra">Juda katta</option></select></label>
        <label className="check-row"><input type="checkbox" checked={!prefs.motion} onChange={event => change('motion', !event.target.checked)} /> Animatsiyalarni kamaytirish</label>
      </section>
      <section className="panel"><h2>Ovoz va kamera</h2>
        <label className="field">Ovoz tili<select value={prefs.language} onChange={event => change('language', event.target.value)}>{Object.entries(languages).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
        <label className="field">O‘qish tezligi · {prefs.rate.toFixed(1)}×<input type="range" min=".5" max="1.5" step=".1" value={prefs.rate} onChange={event => change('rate', Number(event.target.value))} /></label>
        <label className="field">Afzal kamera<select value={prefs.camera} onChange={event => change('camera', event.target.value as Preferences['camera'])}><option value="user">Old kamera</option><option value="environment">Orqa kamera</option></select></label>
      </section>
      <section className="panel"><h2>Suhbat tarixi</h2><label className="check-row"><input type="checkbox" checked={prefs.history} onChange={event => change('history', event.target.checked)} /> Tarixni shu brauzerda saqlash</label><p className="subtext">Bu sozlama o‘chiq bo‘lsa, yozuvlar faqat joriy seansda ko‘rinadi.</p></section>
      <section className="panel"><h2>Maxfiylik va ma’lumotlar</h2><p>Saqlangan sozlamalar, saralangan iboralar, qoralamalar va suhbat tarixini tozalashingiz mumkin.</p><div className="actions"><button className="button secondary danger" onClick={() => setConfirm(true)}><Trash2 size={18} /> Mahalliy ma’lumotlarni tozalash</button><Link href="/maxfiylik" className="text-link"><ShieldCheck size={17} /> Maxfiylik haqida</Link></div></section>
    </div>
    <Dialog open={confirm} onChange={setConfirm} title="Mahalliy ma’lumotlarni tozalash"><p>Sozlamalar boshlang‘ich holatga qaytadi. Saralangan iboralar, qoralamalar va suhbat tarixi o‘chiriladi.</p><button className="button secondary danger" onClick={() => { clearData(); setConfirm(false) }}>Tozalashni tasdiqlash</button></Dialog>
  </div>
}
