import { z } from 'zod'
import { configsStr } from '../../strings/configs'

export const configInputSchema = z.object({
  group: z.string(),
  key: z
    .string()
    .min(1, configsStr.errors.keyRequired)
    .refine((v) => !v.includes(':'), configsStr.errors.keyInvalid),
  value: z.string().min(1, configsStr.errors.valueRequired),
  description: z.string(),
})
export type ConfigInputValues = z.infer<typeof configInputSchema>
