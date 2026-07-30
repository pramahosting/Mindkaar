// Maps the 6 assessment scenario categories (from the intake/Likert flow)
// to whichever of the 4 Run Simulation roleplay scenarios is the closest
// thematic fit. Run Simulation's scenario catalog is independent (it isn't
// generated from the assessment), so this is what connects the two
// features instead of leaving Run Simulation feeling unrelated.
export const CATEGORY_TO_SIM_SLUG = {
  anxiety: 'anxious_student',
  conflict: 'workplace_conflict',
  loneliness: 'sad_friend',
  burnout: 'sad_friend',
  stress: 'angry_customer',
  unrest: 'angry_customer',
}

export function recommendedSimSlug(scenario) {
  const categoryId = scenario?.primary?.id
  return categoryId ? CATEGORY_TO_SIM_SLUG[categoryId] || null : null
}
