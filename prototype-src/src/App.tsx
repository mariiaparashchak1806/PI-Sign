import { useState } from 'react'
import LeadOverview, { type Concept } from './pages/LeadOverview'

// Links: /prototype/concept-1/ (Option 1), /prototype/concept-1/option-2/, /prototype/concept-2/.
// The bare /prototype/ is Concept 1; ?concept=2 and ?option=2 still work for old links and local dev.
const q = new URLSearchParams(location.search)
const concept: Concept = /\/concept-2\/?$/.test(location.pathname) || q.get('concept') === '2' ? 2 : 1
const option0: 1 | 2 = /\/option-2\/?$/.test(location.pathname) || q.get('option') === '2' ? 2 : 1
const BASE = import.meta.env.BASE_URL // '/PI-Sign/prototype/' in production, '/' in dev

export default function App() {
  const [option, setOption] = useState<1 | 2>(option0)
  const pick = (o: 1 | 2) => {
    setOption(o); window.scrollTo({ top: 0 })
    const u = new URL(location.href)
    u.pathname = `${BASE}concept-1/${o === 2 ? 'option-2/' : ''}`; u.searchParams.delete('option'); u.searchParams.delete('tab')
    history.replaceState(null, '', u)
  }
  return (
    <>
      <LeadOverview key={`${concept}-${option}`} concept={concept} option={option} />
      {concept === 1 && (
        <div className="variant-switch" role="radiogroup" aria-label="Concept 1 variant">
          {([1, 2] as const).map((o) => (
            <button key={o} role="radio" aria-checked={option === o} className={option === o ? 'on' : ''} onClick={() => pick(o)}>Option {o}</button>
          ))}
        </div>
      )}
    </>
  )
}
