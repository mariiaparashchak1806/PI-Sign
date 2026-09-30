import { useEffect, useState } from 'react'
import LeadOverview, { type Concept } from './pages/LeadOverview'

// Presenter switch between the two layout concepts; the choice is kept in the URL (?concept=2) so a link opens the right one.
const initial = (): Concept => (new URLSearchParams(location.search).get('concept') === '2' ? 2 : 1)

export default function App() {
  const [concept, setConcept] = useState<Concept>(initial)
  useEffect(() => {
    const u = new URL(location.href)
    if (concept === 2) u.searchParams.set('concept', '2'); else u.searchParams.delete('concept')
    history.replaceState(null, '', u)
  }, [concept])
  return (
    <>
      <LeadOverview concept={concept} />
      <div className="concept-switch" role="radiogroup" aria-label="Layout concept">
        {([1, 2] as const).map((c) => (
          <button key={c} role="radio" aria-checked={concept === c} className={concept === c ? 'on' : ''} onClick={() => { setConcept(c); window.scrollTo({ top: 0 }) }}>
            Concept {c}
          </button>
        ))}
      </div>
    </>
  )
}
