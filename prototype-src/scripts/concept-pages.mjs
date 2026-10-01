// After the build: give each concept its own URL (/prototype/concept-1/, /prototype/concept-2/).
// The pages are copies of index.html — assets use the absolute base, the app picks the concept from the path.
import fs from 'fs'
const out = '../prototype'
for (const c of ['concept-1', 'concept-2']) {
  fs.mkdirSync(`${out}/${c}`, { recursive: true })
  fs.copyFileSync(`${out}/index.html`, `${out}/${c}/index.html`)
}
console.log('concept pages: concept-1/, concept-2/')
