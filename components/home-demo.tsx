'use client'
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, AudioLines, Hand, Keyboard, Mic, ScanLine, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { useSado } from './shell'

const demoSteps = [
  { title: 'Kamera', icon: Hand, text: 'Foydalanuvchi kameraga ishora qiladi.' },
  { title: 'Tanish', icon: ScanLine, text: 'Tasdiqlangan model harakat ketma-ketligini tahlil qiladi.' },
  { title: 'Matn va ovoz', icon: Volume2, text: 'Tanilgan ishora matnga chiqadi. Matnni ovozli o‘qish mumkin.' },
]
export function HeroDemo() {
  const [step, setStep] = useState(0)
  const reduced = useReducedMotion()
  const { prefs } = useSado()
  const { icon: Icon, text } = demoSteps[step]
  return <div className="demo" aria-label="Ishoradan matnga namoyishi">
    <div className="demo-grid" aria-hidden="true" />
    <span className="demo-caption">ISHLASH TAMOYILI NAMOYISHI</span>
    <div className="demo-orbit" aria-hidden="true" />
    <div className="demo-window sign-demo">
      <div className="demo-header"><div className="demo-icon"><AudioLines size={21} /></div><div><strong>Ishoradan matnga</strong><small>Tayyor namuna</small></div></div>
      <div className="demo-steps" role="group" aria-label="Namoyish qadamlari">
        {demoSteps.map((item, index) => <button key={item.title} type="button" aria-pressed={index === step} onClick={() => setStep(index)}>{item.title}</button>)}
      </div>
      <motion.div key={step} initial={reduced || !prefs.motion ? false : { y: 4 }} animate={{ y: 0 }} transition={{ duration: .16 }} className="sign-demo-state" aria-live="polite">
        <span className="demo-icon"><Icon size={23} /></span>
        {step === 2 && <strong>Assalomu alaykum.</strong>}
        <p>{text}</p>
      </motion.div>
      <div className="demo-bottom"><span>Tayyor namoyish, jonli tanish emas</span><button type="button" onClick={() => setStep((step + 1) % demoSteps.length)} aria-label="Namoyishning keyingi qadami"><ArrowRight size={18} /></button></div>
    </div>
  </div>
}
const tabs = [
  { title: 'Matn', icon: Keyboard, details: 'Gapingizni yozing va uni suhbatdoshingizga katta harflarda ko‘rsating.', href: '/muloqot' },
  { title: 'Ovoz', icon: Mic, details: 'Matnni ovozli o‘qing yoki brauzer qo‘llasa, mikrofon orqali javobni yozuvga aylantiring.', href: '/muloqot?javob=1' },
  { title: 'Kamera', icon: Hand, details: 'Jonli kamera va tahrirlanadigan matnni oching. Ishoralarni tanish uchun tasdiqlangan model kerak.', href: '/kamera' },
]
export function ToolTabs() {
  const [active, setActive] = useState(0)
  const { icon: Icon, details, href } = tabs[active]
  return <div className="panel tab-demo"><div className="segmented" role="group" aria-label="Muloqot usullari">{tabs.map((tab, index) => <button key={tab.title} aria-pressed={active === index} onClick={() => setActive(index)}>{tab.title}</button>)}</div><span className="tile mint"><Icon /></span><p>{details}</p><Link href={href} className="text-link">Sinab ko‘rish <ArrowRight size={16} /></Link></div>
}
