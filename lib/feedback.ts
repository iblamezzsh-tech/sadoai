export const feedbackCategories = ['Xatolik', 'Foydalanishdagi qiyinchilik', 'Ishorani aniqlash'] as const
export const feedbackLimit = 1800
export type FeedbackInput = { category: string; message: string; contact: string }
export type FeedbackResult = { status: 'idle' | 'sent' | 'error'; message: string }

export function validateFeedback(input: FeedbackInput) {
  if (!feedbackCategories.some(category => category === input.category)) return 'Mavzuni tanlang.'
  if (input.message.length < 10 || input.message.length > feedbackLimit) return 'Xabar 10 tadan 1800 tagacha belgidan iborat bo‘lsin.'
  if (input.contact && (input.contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact))) return 'Email manzilini tekshiring yoki maydonni bo‘sh qoldiring.'
  return ''
}
