import type { Metadata } from 'next'
import { Phrasebook } from '@/components/iboralar'
export const metadata: Metadata = { title: 'Iboralar' }
export default function Page() { return <Phrasebook /> }
