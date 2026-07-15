import { difficultyDots } from '../utils.js';

export default function DifficultyDots({ value, label = 'DIFFICULTY' }) {
  const dots = difficultyDots(value);
  if (!dots) return null;

  return (
    <div className="dial">
      <div className="dots">
        {Array.from({ length: dots.total }).map((_, i) => (
          <span key={i} className={`dot${i < dots.filled ? ' filled' : ''}`} />
        ))}
      </div>
      <span className="label">{label}</span>
    </div>
  );
}
