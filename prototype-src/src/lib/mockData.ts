// Prototype data that is not drawn in the mock (menus, options, AI replies). Names reuse people from the mock's Activity.
export const designers = ['Anna Kovalenko', 'Mark Evans', 'Jeffrey Lindon', 'Test Designer']

// Project statuses as seen in the PiSuite staging "Change Status" dialog / lead pipeline.
// Only "Scheduled Leads" and "Pending Leads" colours are drawn in the mock; the rest reuse existing tokens.
export const projectStatuses: { label: string; bg: string; fg: string; dot: string }[] = [
  { label: 'Initial Lead', bg: 'var(--color-bg-subtle)', fg: 'var(--color-text-secondary)', dot: 'var(--color-text-secondary)' },
  { label: 'Scheduled Leads', bg: 'var(--color-status-scheduled-bg)', fg: 'var(--color-black)', dot: 'var(--color-success)' },
  { label: 'Pending Leads', bg: 'var(--color-warning-bg)', fg: 'var(--color-warning)', dot: 'var(--color-warning)' },
  { label: 'Ready to Sign', bg: 'var(--color-ai-bg)', fg: 'var(--color-ai)', dot: 'var(--color-ai)' },
  { label: 'Production', bg: 'var(--color-success-bg)', fg: 'var(--color-success)', dot: 'var(--color-success)' },
]

export const projectTypes = ['Kitchen', 'Bathroom', 'Basement', 'Laundry', 'Closet']

export const aiAnswers: Record<string, string> = {
  'Summarize this lead':
    'Cheryl Isaac (Washington DC) has 3 projects worth $13,128. Kitchen is fully estimated ($8,778); Bathroom is estimated but still needs before photos; Basement is empty. The consultation was on Sep 24 and one task is overdue. No designer is assigned yet.',
  'What’s missing before the quote?':
    'Three things: 1) a designer — nobody is assigned; 2) before photos for Bathroom (required); 3) any line items for Basement. The agreement is already sent and awaiting signature.',
  'Draft a follow-up SMS':
    '“Hi Cheryl, thanks again for the consultation! Your kitchen and bathroom estimate is ready — could you send a few photos of the bathroom so we can finalise the quote?”',
}
export const aiFallback = 'In the real product I’d answer from the lead’s history, estimate and messages. Try one of the suggestions above to see an example.'

// Options for the lead "Info" dialog (values shown in the card are pre-selected).
export const leadOptions = {
  stores: ['VKB, Bethesda, MD', 'VKB, Rockville, MD', 'VKB, Arlington, VA'],
  sources: ['Google', 'Facebook/Instagram', 'Referral', 'Home show', 'Yelp'],
  starts: ['ASAP', '1–3 months', '3–6 months', '6+ months'],
  houseTypes: ['Single House', 'Townhouse', 'Condo', 'Apartment'],
  houseAges: ['Under 1 year', '1-5 years', '5-10 years', '10-20 years', '20+ years'],
}
