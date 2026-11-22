import type { ComponentProps } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'icon' }

export function Button({ className, variant = 'secondary', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={twMerge(clsx(variant === 'icon' ? 'icon-button' : ['button', variant], className))} {...props} />
}
