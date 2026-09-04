import { z } from 'zod'
import { authStr } from '../../strings/auth'

export const loginSchema = z.object({
  userName: z.string().min(1, authStr.errors.userNameRequired),
  password: z.string().min(1, authStr.errors.passwordRequired),
})
export type LoginValues = z.infer<typeof loginSchema>

export const initPasswordSchema = z
  .object({
    password: z.string().min(6, authStr.errors.passwordMin),
    confirmPassword: z.string().min(6, authStr.errors.passwordMin),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: authStr.errors.passwordMismatch,
  })
export type InitPasswordValues = z.infer<typeof initPasswordSchema>
