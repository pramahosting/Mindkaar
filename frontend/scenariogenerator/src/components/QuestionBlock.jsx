export default function QuestionBlock({ question, index }) {
  const options = question.options || [];
  const difficulty = question && typeof question === 'object' ? question.difficulty ?? null : null;

  return (
    <div className="question-block">
      <div className="question-number">
        Question {index + 1}
        {difficulty !== null ? ` · Difficulty ${difficulty}` : ''}
      </div>
      <div className="narrative">{question.narrative || ''}</div>
      <p className="options-label">How do you respond?</p>

      {options.length === 0 && (
        <p className="empty-hint">No response options were returned for this question.</p>
      )}

      {options.map((opt, i) => {
        const label = opt.id !== undefined && opt.id !== null && opt.id !== '' ? opt.id : opt.letter || '';
        const strategy = opt.strategy || opt.trait || '';
        return (
          <div className="option" key={i}>
            <div className="letter">{String(label)}</div>
            <div className="body">
              <p>{opt.text || ''}</p>
              {strategy && <span className="trait">{strategy}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
