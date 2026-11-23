'use server'

import { validateFeedback, type FeedbackResult } from './feedback'

export async function submitFeedback(_previous: FeedbackResult, data: FormData): Promise<FeedbackResult> {
  const configured = process.env.FEEDBACK_WEBHOOK_URL
  if (!configured) return { status: 'error', message: 'Yuborish xizmati sozlanmagan. Xabarni nusxalashingiz mumkin.' }
  const input = {
    category: String(data.get('category') ?? '').trim(),
    message: String(data.get('message') ?? '').trim(),
    contact: String(data.get('contact') ?? '').trim(),
  }
  const error = validateFeedback(input)
  if (error) return { status: 'error', message: error }
  try {
    const url = new URL(configured)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid feedback destination')
    const token = process.env.FEEDBACK_WEBHOOK_TOKEN
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ category: input.category, message: input.message, ...(input.contact ? { contact: input.contact } : {}) }),
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
    })
    await response.body?.cancel()
    if (!response.ok) throw new Error('Feedback declined')
    return { status: 'sent', message: 'Xabaringiz qabul qilindi.' }
  } catch {
    return { status: 'error', message: 'Xabarni yuborib bo‘lmadi. Qayta urinib ko‘ring yoki xabarni nusxalang.' }
  }
}
