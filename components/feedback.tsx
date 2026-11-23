'use client'

import { useActionState, useState } from 'react'
import { Copy, Download, Send } from 'lucide-react'
import { copyText } from '@/lib/browser'
import { feedbackCategories, feedbackLimit, type FeedbackResult } from '@/lib/feedback'
import { submitFeedback } from '@/lib/feedback-action'
import { useSado } from './shell'

export function Feedback({ canSubmit }: { canSubmit: boolean }) {
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<string>(feedbackCategories[0])
  const [contact, setContact] = useState('')
  const [result, action, pending] = useActionState<FeedbackResult, FormData>(submitFeedback, { status: 'idle', message: '' })
  const { setNotice } = useSado()
  const feedback = [category, message.trim(), contact.trim()].filter(Boolean).join('\n\n')
  const Fields = canSubmit ? 'form' : 'div'

  function download() {
    const url = URL.createObjectURL(new Blob([feedback], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'sadoai-fikr.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="panel"><h2>Fikr va takliflar</h2>
    <p>{canSubmit ? 'Muammoni yoki taklifingizni yozing. Javob olishni istasangiz, email manzilingizni qoldiring.' : 'Yuborish xizmati sozlanmagan. Fikringizni nusxalashingiz yoki faylga yuklab olishingiz mumkin.'}</p>
    <p className="hint">Suhbat matni yoki shaxsiy media fayllarini kiritmang.</p>
    <Fields action={canSubmit ? action : undefined}>
      <label className="field">Mavzu<select name="category" value={category} onChange={event => setCategory(event.target.value)}>
        {feedbackCategories.map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label className="field">Xabar<textarea name="message" required minLength={10} maxLength={feedbackLimit} value={message} onChange={event => setMessage(event.target.value)} /></label>
      <label className="field">Email (ixtiyoriy)<input className="text-input" name="contact" type="email" autoComplete="email" maxLength={254} value={contact} onChange={event => setContact(event.target.value)} /></label>
      <div className="actions">
        {canSubmit && <button className="button primary" type="submit" disabled={pending || message.trim().length < 10}><Send size={17} /> {pending ? 'Yuborilmoqda…' : 'Fikrni yuborish'}</button>}
        <button type="button" className="button secondary" disabled={!message.trim()} onClick={async () => setNotice(await copyText(feedback) ? 'Taklif nusxalandi.' : 'Nusxalab bo‘lmadi. Fayl qilib olishni sinang.')}><Copy size={17} /> Nusxalash</button>
        <button type="button" className="button secondary" disabled={!message.trim()} onClick={download}><Download size={17} /> Fayl qilib olish</button>
      </div>
      {result.status === 'error' && <p role="alert" className="error">{result.message}</p>}
      {result.status === 'sent' && <p role="status">{result.message}</p>}
    </Fields>
  </section>
}
