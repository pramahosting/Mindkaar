import React from 'react'

/**
 * Mindkaar mark: a rounded badge holding a single ascending pulse-line —
 * half heartbeat/EEG trace, half mountain ascent — resolving into a small
 * spark at its peak. It reads as "a mind finding its rhythm and rising",
 * which is the whole product in one shape: assess where you are, train,
 * level up. Built at a 48x48 grid so it stays legible down to favicon size.
 */
export function LogoMark({ size = 36, rounded = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mindkaar"
    >
      <defs />
      <rect width="48" height="48" rx={rounded ? 14 : 0} fill="#7C5CFF" />
      <path
        d="M8 30 L15.5 30 L19 21 L23.5 36 L28 16 L31.5 30 L40 30"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.96"
      />
      <circle cx="28" cy="16" r="3.4" fill="#FFC857" />
    </svg>
  )
}

export default function Logo({ size = 36, withText = true, light = false, className = '' }) {
  return (
    <span className={`mk-logo ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      {withText && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: size * 0.5,
            letterSpacing: '-0.01em',
            color: light ? '#ffffff' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          Mind<span style={{ color: light ? '#FFC857' : 'var(--rose-500)' }}>kaar</span>
        </span>
      )}
    </span>
  )
}
