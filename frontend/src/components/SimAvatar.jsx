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

// A simple stylized hand silhouette (not meant to be anatomically precise -
// just readable as "a gesturing hand" at small size). Mirrored via CSS
// transform for the right hand.
function HandShape({ className }) {
  return (
    <svg viewBox="0 0 60 72" className={className} aria-hidden="true">
      <path
        d="M30 70 C16 70 9 57 11 41 C12 31 9 21 11 13 C12 7 19 5 21 11
           C22 16 21 23 22 23 C23 23 23 13 24 7 C25 2 33 2 34 8
           C35 14 34 23 35 23 C36 23 37 13 39 9 C41 4 48 6 48 12
           C48 19 46 25 47 26 C48 27 50 19 52 16 C54 12 60 15 59 21
           C57 33 51 46 51 56 C51 64 43 70 30 70 Z"
        fill="var(--sim-hand-color, #e2b184)"
      />
    </svg>
  )
}

// gender: 'male' | 'female' - picks a real human portrait photo matching
// the voice (see src/lib/avatarGender.js for how gender is decided, and
// src/lib/humanAvatar.js for the photo itself). `seed` keeps the same
// character showing the same photo every time rather than a random one
// per render.
//
// Since the avatar is a static photo (not an illustration we control the
// geometry of): the mouth gesture is done by cropping just the mouth
// region out of that same photo into a small overlay and animating it;
// hand gestures are added as simple stylized hand shapes below the frame
// (the photo itself is a headshot with no hands in it), animated with a
// natural, slightly-offset bobbing/rotating motion while isSpeaking, along
// with a subtle head movement on the photo itself.
export default function SimAvatar({ primaryEmotion, intensity, isSpeaking, gender = 'female', seed = 'default' }) {
  const emo = resolveEmotion(primaryEmotion)
  const glowOpacity = 0.25 + Math.min(1, Math.max(0, intensity)) * 0.5
  const glowAlphaHex = Math.round(glowOpacity * 255).toString(16).padStart(2, '0')
  const photoUrl = getHumanAvatarPhotoUrl(gender, seed)

  return (
    <div className="sim-avatar-wrap">
      <div className="sim-avatar-stage">
        <HandShape className={`sim-hand sim-hand-left ${isSpeaking ? 'sim-hand-talking-left' : ''}`} />
        <HandShape className={`sim-hand sim-hand-right ${isSpeaking ? 'sim-hand-talking-right' : ''}`} />

        <div
          className={`sim-avatar-photo-ring ${isSpeaking ? 'sim-head-talking' : ''}`}
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
