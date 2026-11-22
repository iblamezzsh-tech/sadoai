'use client'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

export function Dialog({ open, onChange, title, children, presentation = false }: {
  open: boolean; onChange: (open: boolean) => void; title: string; children: React.ReactNode; presentation?: boolean
}) {
  const returnFocus = useRef<HTMLElement | null>(null)
  return <DialogPrimitive.Root open={open} onOpenChange={onChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="overlay" />
      <DialogPrimitive.Content className={presentation ? 'dialog presentation' : 'dialog'} aria-describedby={undefined}
        onCloseAutoFocus={event => {
          const active = returnFocus.current
          if (active?.isConnected) { event.preventDefault(); active.focus() }
        }}
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement | null }}>
        <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close asChild><Button className="dialog-close" aria-label="Yopish"><X size={20} /><span>Yopish</span></Button></DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
