import { z } from 'zod'
import { appsStr } from '../../strings/apps'

export const appInputSchema = z.object({
  name: z.string().min(1, appsStr.errors.nameRequired),
  id: z
    .string()
    .min(1, appsStr.errors.appIdRequired)
    .regex(/^[a-zA-Z0-9_-]{1,64}$/, appsStr.errors.appIdInvalid),
  group: z.string(),
  enabled: z.boolean(),
  inheritanced: z.boolean(),
  inheritancedApps: z.array(z.string()),
})
export type AppInputValues = z.infer<typeof appInputSchema>
