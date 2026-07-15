import QuestionBlock from './QuestionBlock.jsx';
import { topicDescription, topicKey, topicName } from '../utils.js';

export default function QuestionPanel({
  activeKey,
  topics,
  questionState,
  questionCache,
  questionError,
  onRetry,
}) {
  const state = activeKey !== null ? questionState[activeKey] : null;
  const idx = activeKey !== null ? topics.findIndex((t, i) => topicKey(t, i) === activeKey) : -1;
  const topic = idx > -1 ? topics[idx] : null;

  return (
    <section className="panel" id="detail-panel">
      <p className="panel-label">Questions</p>

      {activeKey === null && (
        <div className="detail-empty">Select a topic from the list to see its 10 questions here.</div>
      )}

      {activeKey !== null && state === 'loading' && (
        <div className="detail-loading">Generating 10 questions for this topic…</div>
      )}

      {activeKey !== null && (state === 'error' || state === 'timeout' || !questionCache[activeKey]) && state !== 'loading' && (
        <div className="detail-error">
          <span>{questionError[activeKey] || 'Something went wrong loading this topic.'}</span>
          <button type="button" className="retry-btn" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {activeKey !== null && state === 'ready' && questionCache[activeKey] && (
        <div className="detail">
          <h2>{topic ? topicName(topic) : 'Topic'}</h2>
          {topic && topicDescription(topic) && (
            <p className="topic-description">{topicDescription(topic)}</p>
          )}
          {questionCache[activeKey].map((q, i) => (
            <QuestionBlock key={q.id ?? i} question={q} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
