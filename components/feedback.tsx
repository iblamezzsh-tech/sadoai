'use client'
import { useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { copyText } from '@/lib/browser'
import { useSado } from './shell'

export function Feedback() {
  const [message, setMessage] = useState('')
  const { setNotice } = useSado()
  function download() {
    const url = URL.createObjectURL(new Blob([message], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'sadoai-fikr.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="panel"><h2>Fikr va takliflar</h2>
    <p>Taklifingizni yozing va uni ulashish uchun nusxalang yoki fayl qilib oling. Matn bu sahifadan yuborilmaydi.</p>
    <label className="field">Taklifingiz<textarea value={message} onChange={event => setMessage(event.target.value)} /></label>
    <div className="actions"><button className="button secondary" disabled={!message.trim()} onClick={async () => setNotice(await copyText(message) ? 'Taklif nusxalandi.' : 'Nusxalab bo‘lmadi. Fayl qilib olishni sinang.')}><Copy size={17} /> Nusxalash</button><button className="button secondary" disabled={!message.trim()} onClick={download}><Download size={17} /> Fayl qilib olish</button></div>
  </section>
}
