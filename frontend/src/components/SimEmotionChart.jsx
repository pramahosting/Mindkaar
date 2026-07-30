import React from 'react'

const SERIES = [
  { key: 'anger', color: '#f43f5e', label: 'Anger' },
  { key: 'frustration', color: '#fbbf24', label: 'Frustration' },
  { key: 'trust', color: '#1dd9c8', label: 'Trust' },
  { key: 'calmness', color: '#60a5fa', label: 'Calmness' },
]

export default function SimEmotionChart({ history }) {
  if (!history || history.length === 0) {
    return <p className="mg-subtitle">No emotion data recorded for this session.</p>
  }

  const width = 640
  const height = 220
  const padding = 32
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const n = history.length

  const xFor = (i) => padding + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yFor = (v) => padding + innerH - v * innerH

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="sim-chart-svg" role="img" aria-label="Emotion journey over the conversation">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={padding} x2={width - padding} y1={yFor(g)} y2={yFor(g)} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {SERIES.map((s) => {
          const points = history.map((h, i) => `${xFor(i)},${yFor(Number(h[s.key]))}`).join(' ')
          return (
            <polyline key={s.key} points={points} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )
        })}
        {history.map((h, i) => (
          <text key={i} x={xFor(i)} y={height - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">{i}</text>
        ))}
      </svg>
      <div className="sim-chart-legend">
        {SERIES.map((s) => (
          <div key={s.key} className="sim-chart-legend-item">
            <span className="sim-chart-legend-dot" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}
