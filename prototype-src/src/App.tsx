import LeadOverview, { type Concept } from './pages/LeadOverview'

// Each concept has its own link: /prototype/concept-1/ and /prototype/concept-2/ (the bare /prototype/ is Concept 1).
// ?concept=2 still works for old links and local dev.
const concept: Concept = /\/concept-2\/?$/.test(location.pathname) || new URLSearchParams(location.search).get('concept') === '2' ? 2 : 1

export default function App() {
  return <LeadOverview concept={concept} />
}
