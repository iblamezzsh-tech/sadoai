'use client'
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, AudioLines, Check, Hand, Keyboard, MessageCircle, Mic, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { useSado } from './shell'

const conversations = [
  ['Assalomu alaykum! Sizga qanday yordam bera olaman?', 'Salom! Iltimos, sekinroq gapiring.'],
  ['Albatta. Javobni yozib beraymi?', 'Ha, iltimos. Rahmat!'],
]
export function HeroDemo() {
  const [turn, setTurn] = useState(0)
  const reduced = useReducedMotion()
  const { prefs } = useSado()
  return <div className="demo" aria-label="SadoAI suhbat namunasi">
    <div className="demo-grid" aria-hidden="true" />
    <span className="demo-caption"><span /> JONLI NAMUNA</span>
    <div className="demo-orbit" aria-hidden="true" />
    <div className="demo-window">
      <div className="demo-header"><div className="demo-icon"><AudioLines size={21} /></div><div><strong>Muloqot studiyasi</strong><small>Suhbat namunasi</small></div></div>
      <motion.div key={turn} initial={reduced || !prefs.motion || turn === 0 ? false : { y: 4 }} animate={{ y: 0 }} transition={{ duration: .2 }} className="demo-messages" aria-live="polite">
        <div className="demo-reply"><div className="avatar"><MessageCircle size={16} /></div><div><small>Suhbatdosh</small><p>{conversations[turn][0]}</p></div></div>
        <div className="demo-self"><small>Siz</small><p>{conversations[turn][1]} <Check size={15} /></p></div>
      </motion.div>
      <div className="demo-bottom"><span><Volume2 size={16} /> Matndan ovozga</span><button type="button" onClick={() => setTurn((turn + 1) % conversations.length)} aria-label="Keyingi suhbat namunasi"><ArrowRight size={18} /></button></div>
    </div>
    <div className="demo-floating"><span><AudioLines size={23} /></span><div><strong>Ovozli muloqot</strong><small>Matnni ovozga aylantirish</small></div></div>
  </div>
}
const tabs = [
  { title: 'Matn', icon: Keyboard, details: 'Gapingizni yozing va uni suhbatdoshingizga katta harflarda ko‘rsating.', href: '/muloqot' },
  { title: 'Ovoz', icon: Mic, details: 'Matnni ovozli o‘qing yoki brauzer qo‘llasa, mikrofon orqali javobni yozuvga aylantiring.', href: '/muloqot?javob=1' },
  { title: 'Kamera', icon: Hand, details: 'Eksperimental laboratoriyada cheklangan qo‘l shakllarini aniqlab ko‘ring.', href: '/kamera' },
]
export function ToolTabs() {
  const [active, setActive] = useState(0)
  const { icon: Icon, details, href } = tabs[active]
  return <div className="panel tab-demo"><div className="segmented" role="group" aria-label="Muloqot usullari">{tabs.map((tab, index) => <button key={tab.title} aria-pressed={active === index} onClick={() => setActive(index)}>{tab.title}</button>)}</div><span className="tile mint"><Icon /></span><p>{details}</p><Link href={href} className="text-link">Sinab ko‘rish <ArrowRight size={16} /></Link></div>
}
