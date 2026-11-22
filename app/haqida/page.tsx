import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/shell'
import { Feedback } from '@/components/feedback'
export const metadata: Metadata = { title: 'Loyiha haqida' }
export default function Page() {
  return <div className="shell workspace">
    <PageHeader eyebrow="SADOAI HAQIDA" title="Har bir insonning ovozi bor." description="Biz O‘zbekistondan boshlab kundalik muloqotni ko‘proq odamlar uchun qulay qilishni maqsad qilganmiz." />
    <div className="prose">
      <section className="panel"><h2>Kimlar uchun?</h2><p>SadoAI kar va zaif eshituvchi insonlar, gapirmaydigan odamlar hamda gaplashish yoki eshitish qiyin bo‘lgan vaziyatdagi har bir kishi uchun mo‘ljallangan. Suhbatdosh ham shu ekranda yozib javob bera oladi.</p></section>
      <section className="panel"><h2>Hozir nimalar ishlaydi?</h2>
        <ul><li>Matn yozish, uni ko‘rsatish va nusxalash</li><li>O‘zbekcha tayyor iboralar va yordam so‘rash uchun xabarlar</li><li>Brauzer va qurilma qo‘llasa, ovozli o‘qish va ovozni matnga aylantirish</li><li>Jonli kamera va tahrirlanadigan matn. Ishora tilini tanish tasdiqlangan model ulanganda ishlaydi.</li><li>Ayrim qo‘l shakllarini aniqlovchi tajriba laboratoriyasi</li></ul>
        <Link href="/muloqot" className="text-link">Muloqot studiyasini ochish</Link>
      </section>
      <section className="panel"><h2>Keyingi tadqiqotlar</h2><p>O‘zbek ishora tilini tanish uchun ishora tilidan foydalanadigan hamjamiyat bilan ishlash, rozilik asosida ma’lumot yig‘ish va maxsus model tayyorlash rejalashtirilgan. Ketma-ket ishoralarni ajratish va qo‘shimcha qulayliklarni sinash ham shu ishning bir qismi.</p></section>
      <Feedback />
    </div>
  </div>
}
