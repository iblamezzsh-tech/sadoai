import Link from 'next/link'
import { ArrowRight, ArrowUpRight, AudioLines, BookOpen, Camera, ChevronRight, Eye, Hand, HeartHandshake, Keyboard, MessageCircle, ShieldCheck, Sparkles, Volume2 } from 'lucide-react'
import { HeroDemo, ToolTabs } from '@/components/home-demo'

const tools = [
  { href: '/muloqot', icon: MessageCircle, name: 'Muloqot studiyasi', text: 'Xabaringizni yozing, ovozli o‘qing yoki katta ekranda ko‘rsating.', color: 'mint' },
  { href: '/iboralar', icon: BookOpen, name: 'Iboralar kitobi', text: 'Kundalik suhbat va yordam so‘rash uchun tayyor o‘zbekcha iboralar.', color: 'lavender' },
  { href: '/kamera', icon: Camera, name: 'Ishoradan matnga', text: 'Jonli kamera, model holati va tahrirlanadigan o‘zbekcha matn bir joyda.', color: 'peach' },
]
export default function Home() {
  return <>
    <section className="hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <span className="eyebrow hero-badge"><span /> HAMMA UCHUN OCHIQ MULOQOT</span>
          <h1>Har bir insonning<br className="hero-break" /> <em>ovozi bor.</em></h1>
          <p>SadoAI — matn, ovoz va texnologiya yordamida insonlar o‘rtasidagi muloqotni osonlashtiruvchi platforma.</p>
          <div className="hero-actions"><Link className="button primary" href="/muloqot">Muloqotni boshlash <ArrowRight size={19} /></Link><a className="button secondary" href="#qanday">Qanday ishlaydi? <ChevronRight size={17} /></a></div>
          <div className="hero-detail"><ShieldCheck size={17} /> Ro‘yxatdan o‘tish shart emas</div>
        </div>
        <HeroDemo />
      </div>
    </section>
    <section className="shell section tools-section" id="qanday">
      <div className="section-heading"><span className="eyebrow"><span /> MULOQOT VOSITALARI</span><h2>O‘zingizga qulay usulda <br className="desktop-break" />muloqot qiling.</h2><p>Yuzma-yuz suhbatda sizga mos vositani tanlang.</p></div>
      <div className="tool-grid">{tools.map(({ href, name, icon: Icon, text, color }) => <Link key={href} href={href} className="tool-card"><span className={'tile ' + color}><Icon size={23} /></span><ArrowUpRight className="tool-arrow" size={21} /><h3>{name}</h3><p>{text}</p></Link>)}</div>
    </section>
    <section className="band"><div className="shell section split"><div className="section-heading left"><span className="eyebrow"><span /> SADOAI NIMA?</span><h2>Suhbatga qo‘shilish osonroq.</h2><p>Gapirish yoki eshitish qiyin bo‘lgan paytda fikringizni yozish, ko‘rsatish yoki ovoz chiqarib o‘qish mumkin. Suhbatdoshingiz ham xuddi shu ekranda javob bera oladi.</p></div><ToolTabs /></div></section>
    <section className="shell section"><div className="section-heading"><span className="eyebrow"><span /> QANDAY ISHLAYDI?</span><h2>Uch qadamda suhbat.</h2></div><ol className="steps"><li><Keyboard /><h3>Xabaringizni yozing</h3><p>Matn kiriting yoki tayyor iborani tanlang.</p></li><li><Eye /><h3>Ko‘rsating yoki o‘qiting</h3><p>Matnni katta ekranga chiqaring yoki ovozli o‘qiting.</p></li><li><HeartHandshake /><h3>Javobni qabul qiling</h3><p>Suhbatdoshingiz yozishi yoki mikrofon orqali javob berishi mumkin.</p></li></ol></section>
    <section className="shell feature-wrap"><div className="lab-feature"><div><span className="eyebrow"><span /> TAJRIBA</span><h2>Ishora laboratoriyasi</h2><p>Kamera yordamida ayrim qo‘l shakllarini aniqlashni sinab ko‘ring. Natijani xabarga qo‘shishdan oldin o‘zingiz tasdiqlaysiz.</p><Link href="/kamera/tajriba" className="button primary">Laboratoriyani ochish <ArrowRight size={18} /></Link></div><div className="lab-art" aria-hidden="true"><Hand size={89} strokeWidth={1.25} /></div></div></section>
    <section className="shell section split values"><div><span className="tile mint"><ShieldCheck /></span><h3>Maxfiylik va qulaylik</h3><p>Kamera tasviri qurilmangizda tahlil qilinadi. Matn o‘lchami, rang mavzusi va animatsiyalarni o‘zingiz sozlang.</p><Link href="/maxfiylik" className="text-link">Maxfiylik haqida <ArrowRight size={16} /></Link></div><div><span className="tile lavender"><Sparkles /></span><h3>Keyingi qadamlar</h3><p>O‘zbek ishora tilini tanish uchun hamjamiyat bilan ishlash, tekshirilgan ma’lumot to‘plami va maxsus model kerak.</p><Link href="/haqida" className="text-link">Loyiha haqida <ArrowRight size={16} /></Link></div></section>
    <section className="final-cta"><div className="shell"><AudioLines size={30} /><h2>Suhbatni boshlang.</h2><Link href="/muloqot" className="button primary">Muloqot studiyasini ochish <Volume2 size={18} /></Link></div></section>
  </>
}
