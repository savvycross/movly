import type { Template } from '../engine'
import * as bouncePop from './bouncePop'
import * as cleanTitle from './cleanTitle'
import * as countdown from './countdown'
import * as glitchText from './glitchText'
import * as kineticTitle from './kineticTitle'
import * as logoReveal from './logoReveal'
import * as lowerThird from './lowerThird'
import * as neonGlow from './neonGlow'
import * as quoteCard from './quoteCard'
import * as slideStack from './slideStack'
import * as splitReveal from './splitReveal'
import * as typewriter from './typewriter'
import * as wordCarousel from './wordCarousel'

/** Every available template, in picker order. Add new template modules here. */
export const TEMPLATES: readonly Template[] = [
  kineticTitle,
  logoReveal,
  lowerThird,
  countdown,
  quoteCard,
  glitchText,
  bouncePop,
  slideStack,
  typewriter,
  neonGlow,
  splitReveal,
  wordCarousel,
  cleanTitle,
]

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
}
