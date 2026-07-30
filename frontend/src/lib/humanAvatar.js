// Provides an actual human photo (not an illustration) for the Run
// Simulation avatar. There's no image-generation tool available here, and
// embedding a scraped or uploaded photo directly into the app as a
// permanent asset would be a copyright risk, so this uses randomuser.me's
// static portrait photos - a well-known, freely-usable set of placeholder
// people-photos specifically published for use in exactly this kind of
// prototype/demo (see https://randomuser.me/photos), addressed directly
// rather than through their rate-limited API.
//
// The same character always gets the same photo (stable per seed), so it
// doesn't change between sessions or page reloads.
const PHOTO_COUNT = 100 // indices 0-99 exist for both men/ and women/

function stableIndex(seed) {
  const str = (seed || 'default').toString()
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash % PHOTO_COUNT
}

export function getHumanAvatarPhotoUrl(gender, seed) {
  const folder = gender === 'male' ? 'men' : 'women'
  const index = stableIndex(seed)
  return `https://randomuser.me/api/portraits/${folder}/${index}.jpg`
}
