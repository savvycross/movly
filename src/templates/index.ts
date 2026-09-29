import type { Template } from '../engine'
import * as cleanTitle from './cleanTitle'

/** Every available template, in picker order. Add new template modules here. */
export const TEMPLATES: readonly Template[] = [cleanTitle]

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
