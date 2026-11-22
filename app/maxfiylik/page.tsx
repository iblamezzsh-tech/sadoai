import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/shell'
export const metadata: Metadata = { title: 'Maxfiylik' }
export default function Page() {
  return <div className="shell workspace">
    <PageHeader eyebrow="MAXFIYLIK" title="Ma’lumotlaringiz va ruxsatlar" description="SadoAI qanday ma’lumotdan foydalanishini va ruxsatlarni qanday boshqarishni bilib oling." />
    <div className="prose">
      <section className="panel"><h2>Matn va suhbat tarixi</h2><p>Qoralama va yozilgan xabarlar SadoAI serveriga yuborilmaydi. Qoralamalar sahifa yangilanguncha xotirada turadi. Tarix faqat saqlashni yoqsangiz brauzerga yoziladi. Sozlamalar va saralangan iboralar brauzerda saqlanadi.</p></section>
      <section className="panel"><h2>Kamera</h2><p>Kamera tugmani bosib, brauzerga ruxsat berganingizdan keyin ishlaydi. Kadrlar qurilmangizda tahlil qilinadi va saqlanmaydi. Model dastlab Google manzilidan yoki sayt joylashtirgan manzildan yuklanadi.</p></section>
      <section className="panel"><h2>Ovoz</h2><p>Mikrofonni o‘zingiz yoqasiz. Brauzer ovozni tanish uchun uni o‘z xizmatiga yuborishi mumkin. Ovozli o‘qishda ham ayrim tizim ovozlari tarmoqdan foydalanadi. SadoAI audio fayl saqlamaydi. Matnni qo‘lda kiritish doim mumkin.</p></section>
      <section className="panel"><h2>Brauzer xotirasi</h2><p>Internet uzilganda matn va iboralardan foydalanish uchun sahifa va dastur fayllari brauzer keshiga yozilishi mumkin. Kamera va mikrofon ruxsatlarini brauzer sozlamalaridan o‘zgartiring.</p><Link href="/sozlamalar" className="text-link">Mahalliy ma’lumotlarni boshqarish</Link></section>
    </div>
  </div>
}
