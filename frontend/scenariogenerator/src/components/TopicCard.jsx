import DifficultyDots from './DifficultyDots.jsx';
import { topicName } from '../utils.js';

export default function TopicCard({ topic, active, state, onClick }) {
  return (
    <li
      className={`scenario-card${active ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <h3>{topicName(topic)}</h3>
      <DifficultyDots value={topic && typeof topic === 'object' ? topic.difficulty : null} />
      {state === 'loading' && <span className="state-tag loading">loading…</span>}
      {(state === 'error' || state === 'timeout') && (
        <span className="state-tag error">
          {state === 'timeout' ? 'timed out — click to retry' : "couldn\u2019t load — click to retry"}
        </span>
      )}
    </li>
  );
}
