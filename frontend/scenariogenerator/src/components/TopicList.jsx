import TopicCard from './TopicCard.jsx';
import { topicKey } from '../utils.js';

export default function TopicList({ topics, activeKey, questionState, onSelect }) {
  return (
    <section className="panel" id="list-panel">
      <p className="panel-label">Topics</p>

      {(!topics || topics.length === 0) && (
        <div className="empty-hint">
          Fill in your baseline and generate — topics tailored to your profile will appear here. Click one to
          open its 10 questions.
        </div>
      )}

      {topics && topics.length > 0 && (
        <ul className="scenario-list">
          {topics.map((topic, i) => {
            const key = topicKey(topic, i);
            return (
              <TopicCard
                key={key}
                topic={topic}
                active={key === activeKey}
                state={questionState[key]}
                onClick={() => onSelect(key, i)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
