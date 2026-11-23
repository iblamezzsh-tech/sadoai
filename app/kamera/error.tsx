'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/shell'

export default function CameraError({ reset }: { reset: () => void }) {
  return <div className="shell workspace">
    <PageHeader title="Kamera sahifasida xato" description="Qayta urinib ko‘ring yoki muloqot studiyasida matn yozishni davom ettiring." />
    <div className="row">
      <button className="button primary" onClick={reset}>Qayta urinish</button>
      <Link href="/muloqot" className="button secondary">Muloqot studiyasini ochish</Link>
    </div>
  </div>
}
