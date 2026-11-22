import type { Metadata } from 'next'
import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
import './style.css'
import { Shell } from '@/components/shell'

export const metadata: Metadata = {
  title: { default: 'SadoAI — Har bir insonning ovozi bor', template: '%s · SadoAI' },
  description: 'Matn, ovoz va texnologiya yordamida muloqotni osonlashtiruvchi o‘zbekcha platforma.',
}
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uz" suppressHydrationWarning><body><Shell>{children}</Shell></body></html>
}
