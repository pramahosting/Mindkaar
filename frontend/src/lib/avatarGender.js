// Infers which avatar presentation (male/female) to use for the Run
// Simulation character, based on the free-text "how have you been
// feeling" answer from the very first page of the intake form. If the
// person's own text mentions their mother, the avatar is female; if it
// mentions their father, the avatar is male; if neither is mentioned (or
// there's no text at all, e.g. they went straight to Run Simulation
// without ever doing the intake), a consistent pick is made so the same
// person always sees the same avatar rather than it flickering between
// renders.
const MOTHER_WORDS = ['mother', 'mom', 'mum', 'mommy', 'mummy']
const FATHER_WORDS = ['father', 'dad', 'papa', 'daddy', 'pop']

export function inferAvatarGender(text, fallbackSeed = '') {
  const lower = (text || '').toLowerCase()

  const hasMother = MOTHER_WORDS.some((w) => lower.includes(w))
  const hasFather = FATHER_WORDS.some((w) => lower.includes(w))

  if (hasMother && !hasFather) return 'female'
  if (hasFather && !hasMother) return 'male'

  // Neither mentioned (or both, ambiguously) - pick either, but
  // deterministically for this person/session rather than randomly on
  // every render, using a simple stable hash of whatever seed we have.
  const seed = (fallbackSeed || lower || 'default').trim()
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % 2 === 0 ? 'female' : 'male'
}
