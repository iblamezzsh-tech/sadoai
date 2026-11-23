'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AudioLines, BookOpen, Camera, House, MessageCircle, Settings, ArrowUpRight, Moon, Sun, WifiOff } from 'lucide-react'
import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { defaults, parsePreferences, parseHistory, readLocal, saveLocal, removeLocal, insertPhrase, type Entry, type Preferences, type Speaker } from '@/lib/core'

import { parseShortcuts, type GestureShortcuts } from '@/lib/gesture-shortcuts'

const nav = [
  { href: '/', label: 'Bosh sahifa', icon: House },
  { href: '/muloqot', label: 'Muloqot', icon: MessageCircle },
  { href: '/iboralar', label: 'Iboralar', icon: BookOpen },
  { href: '/kamera', label: 'Kamera', icon: Camera },
  { href: '/sozlamalar', label: 'Sozlamalar', icon: Settings },
]
export function Brand() {
  return <Link href="/" className="brand"><span className="brand-icon"><AudioLines size={22} strokeWidth={2.6} /></span><span>Sado<span className="brand-ai">AI</span></span></Link>
}
function useShellState() {
  const [prefs, setPrefs] = useState(defaults)
  const [drafts, setDrafts] = useState({ self: '', partner: '' })
  const [incoming, setIncoming] = useState('')
  const [shortcuts, setShortcuts] = useState<GestureShortcuts>({})
  const [cameraDrafts, setCameraDrafts] = useState<{ id: string; text: string }[]>([])
  const [history, setHistory] = useState<Entry[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const settings = parsePreferences(readLocal('prefs', defaults))
    setPrefs(settings)
    setShortcuts(parseShortcuts(readLocal('gesture-shortcuts', {})))
    if (settings.history) setHistory(parseHistory(readLocal('history', [])))
    const saved = readLocal('favorites', [])
    if (Array.isArray(saved)) setFavorites(saved.filter((item): item is string => typeof item === 'string'))
    setReady(true)
    const connectivity = () => setOnline(navigator.onLine)
    connectivity()
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    return () => { window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity) }
  }, [])
  useEffect(() => {
    if (!ready) return
    saveLocal('prefs', prefs)
    document.documentElement.dataset.theme = prefs.theme
    document.documentElement.dataset.font = prefs.font
    document.documentElement.dataset.motion = prefs.motion ? 'on' : 'off'
  }, [ready, prefs])
  useEffect(() => { if (ready) saveLocal('favorites', favorites) }, [ready, favorites])
  useEffect(() => { if (ready) saveLocal('gesture-shortcuts', shortcuts) }, [ready, shortcuts])
  useEffect(() => {
    if (!ready) return
    if (prefs.history) saveLocal('history', history)
    else removeLocal('history')
  }, [ready, prefs.history, history])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 3900)
    return () => clearTimeout(timer)
  }, [notice])
  const setDraft = useCallback((speaker: Speaker, text: string) => {
    setDrafts(current => ({ ...current, [speaker]: text }))
  }, [])
  function append(phrase: string, speaker: Speaker = 'self') {
    setDrafts(current => ({ ...current, [speaker]: insertPhrase(current[speaker], phrase) }))
  }
  function clearData() {
    for (const key of ['prefs', 'history', 'favorites', 'gesture-shortcuts']) removeLocal(key)
    setPrefs(defaults)
    setFavorites([])
    setHistory([])
    setDrafts({ self: '', partner: '' })
    setIncoming('')
    setShortcuts({})
    setCameraDrafts([])
    setNotice('Mahalliy ma’lumotlar tozalandi.')
  }
  return { prefs, setPrefs, drafts, shortcuts, setShortcuts, incoming, setIncoming, cameraDrafts, setCameraDrafts, setDraft, append, history, setHistory, favorites, setFavorites, notice, setNotice, clearData, online }
}
const Context = createContext<ReturnType<typeof useShellState> | null>(null)
export function useSado() {
  const context = useContext(Context)
  if (!context) throw new Error('Shell is required')
  return context
}
export function Shell({ children }: { children: React.ReactNode }) {
  const state = useShellState()
  const path = usePathname()
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  function theme() {
    const dark = state.prefs.theme === 'dark' || (state.prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    state.setPrefs((current: Preferences) => ({ ...current, theme: dark ? 'light' : 'dark' }))
  }
  return <Context.Provider value={state}>
    <a className="skip" href="#main">Asosiy tarkibga o‘tish</a>
    <header className="site-header"><div className="shell nav-inner">
      <Brand />
      <nav aria-label="Asosiy menyu" className="desktop-nav">{nav.slice(0, 4).map(item =>
        <NavLink online={state.online} key={item.href} href={item.href} active={path === item.href}>{item.label}</NavLink>)}</nav>
      <div className="nav-actions">
        <button className="icon-button theme-button" onClick={theme} aria-label="Rang mavzusini almashtirish"><Moon size={18} className="moon" /><Sun size={18} className="sun" /></button>
        <Link href="/sozlamalar" className="icon-button desktop-settings" aria-label="Sozlamalar"><Settings size={18} /></Link>
        <Link href="/muloqot" className="button nav-cta">Muloqotni boshlash <ArrowUpRight size={16} /></Link>
      </div>
    </div></header>
    {!state.online && <div className="offline" role="status"><WifiOff size={17} /> Internet aloqasi yo‘q. Matn va ochilgan sahifalardan foydalanish mumkin.</div>}
    <main id="main" tabIndex={-1}>{children}</main>
    <footer className="site-footer"><div className="shell footer-inner"><div><Brand /><p>Har bir insonning ovozi bor.</p></div><nav aria-label="Sahifa oxiridagi havolalar"><Link href="/haqida">Loyiha haqida</Link><Link href="/maxfiylik">Maxfiylik</Link><Link href="/sozlamalar">Sozlamalar</Link></nav></div><div className="shell footer-bottom">© {new Date().getFullYear()} SadoAI · O‘zbekcha muloqot platformasi</div></footer>
    <nav className="mobile-nav" aria-label="Mobil menyu">{nav.map(({ href, label, icon: Icon }) => <NavLink online={state.online} key={href} href={href} active={href === path}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    <div className="toast-region" role="status" aria-live="polite">{state.notice && <span className="toast">{state.notice}</span>}</div>
  </Context.Provider>
}

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return <header className="page-header">{eyebrow && <span className="eyebrow"><span />{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></header>
}

function NavLink({ online, href, active, children }: { online: boolean; href: string; active: boolean; children: React.ReactNode }) {
  const props = { href, 'aria-current': active ? 'page' as const : undefined, children }
  return online ? <Link {...props} /> : <a {...props} />
}
