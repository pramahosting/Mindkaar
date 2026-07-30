import React from 'react'
import { getHumanAvatarPhotoUrl } from '../lib/humanAvatar.js'

const EMOTION_STYLES = {
  anger: { color: '#f43f5e', label: 'Angry' },
  frustration: { color: '#fbbf24', label: 'Frustrated' },
  anxiety: { color: '#8b5cf6', label: 'Anxious' },
  sadness: { color: '#60a5fa', label: 'Sad' },
  calm: { color: '#1dd9c8', label: 'Calm' },
  neutral: { color: '#94a3b8', label: 'Neutral' },
}

function resolveEmotion(primary) {
  const key = (primary || 'neutral').toLowerCase()
  if (EMOTION_STYLES[key]) return EMOTION_STYLES[key]
  if (key.includes('frustrat')) return EMOTION_STYLES.frustration
  if (key.includes('ang')) return EMOTION_STYLES.anger
  if (key.includes('anx')) return EMOTION_STYLES.anxiety
  if (key.includes('sad')) return EMOTION_STYLES.sadness
  if (key.includes('calm') || key.includes('trust')) return EMOTION_STYLES.calm
  return EMOTION_STYLES.neutral
}

// gender: 'male' | 'female' - picks a real human portrait photo matching
// the voice (see src/lib/avatarGender.js for how gender is decided, and
// src/lib/humanAvatar.js for the photo itself). `seed` keeps the same
// character showing the same photo every time rather than a random one
// per render.
//
// Since the avatar is a static photo (not an illustration we control the
// geometry of), the speaking gesture is done by cropping just the mouth
// region out of that same photo into a small overlay, then animating that
// overlay's scale/position and a dark "gap" underneath it to read as an
// opening/closing mouth while isSpeaking is true. The crop position below
// is tuned for randomuser.me's consistent front-facing headshot framing.
export default function SimAvatar({ primaryEmotion, intensity, isSpeaking, gender = 'female', seed = 'default' }) {
  const emo = resolveEmotion(primaryEmotion)
  const glowOpacity = 0.25 + Math.min(1, Math.max(0, intensity)) * 0.5
  const glowAlphaHex = Math.round(glowOpacity * 255).toString(16).padStart(2, '0')
  const photoUrl = getHumanAvatarPhotoUrl(gender, seed)

  return (
    <div className="sim-avatar-wrap">
      <div
        className="sim-avatar-photo-ring"
        style={{ boxShadow: `0 0 0 6px ${emo.color}${glowAlphaHex}` }}
      >
        <img
          src={photoUrl}
          alt={`Avatar showing a ${emo.label.toLowerCase()} expression`}
          className="sim-avatar-photo"
        />
        <div
          className={`sim-mouth-overlay ${isSpeaking ? 'sim-mouth-talking' : ''}`}
          style={{
            backgroundImage: `url(${photoUrl})`,
          }}
          aria-hidden="true"
        >
          <span className="sim-mouth-gap" />
        </div>
      </div>
      <div className="sim-avatar-tag">
        <span className="sim-avatar-dot" style={{ backgroundColor: emo.color }} aria-hidden="true" />
        <span className="sim-avatar-label">{emo.label}</span>
        <span className="sim-avatar-intensity">
          ({Math.round(Math.min(1, Math.max(0, intensity)) * 100)}% intensity)
        </span>
      </div>
      {isSpeaking && <div className="sim-avatar-speaking" aria-live="polite">Speaking…</div>}
    </div>
  )
}
