import * as React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'h-8 w-full rounded-md border border-border bg-input px-2.5 font-inherit text-foreground',
      'placeholder:text-muted-foreground/70 transition-colors duration-150 outline-none',
      'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'
