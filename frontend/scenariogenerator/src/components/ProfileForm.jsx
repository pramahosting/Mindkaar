import { useRef, useState } from 'react';
import ApiSettings from './ApiSettings.jsx';

export default function ProfileForm({ onSubmit, submitting, status, backendUrl, onBackendUrlChange, model, onModelChange }) {
  const formRef = useRef(null);
  const [stressVal, setStressVal] = useState(5);

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(formRef.current);

    const ageRaw = fd.get('age');
    const sleepRaw = fd.get('sleepHours');

    const profile = {
      name: (fd.get('name') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      age: ageRaw ? Number(ageRaw) : null,
      mood: (fd.get('mood') || '').toString(),
      sleepHours: sleepRaw ? Number(sleepRaw) : null,
      stressLevel: Number(fd.get('stressLevel')) || 5,
      support: (fd.get('support') || '').toString(),
      goals: (fd.get('goals') || '').toString().trim(),
    };

    onSubmit(profile);
  }

  return (
    <section className="panel" id="form-panel">
      <p className="panel-label">Your baseline</p>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input type="text" id="f-name" name="name" placeholder="Jordan Lee" required />
        </div>

        <div className="two-col">
          <div className="field">
            <label htmlFor="f-email">Email</label>
            <input type="email" id="f-email" name="email" placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label htmlFor="f-password">Password</label>
            <input type="password" id="f-password" name="password" placeholder="••••••••" />
          </div>
        </div>

        <div className="two-col">
          <div className="field">
            <label htmlFor="f-age">Age</label>
            <input type="number" id="f-age" name="age" placeholder="27" min="13" max="120" />
          </div>
          <div className="field">
            <label htmlFor="f-mood">Current mood</label>
            <select id="f-mood" name="mood" defaultValue="">
              <option value="">Select…</option>
              <option>Anxious</option>
              <option>Low</option>
              <option>Numb</option>
              <option>Restless</option>
              <option>Okay</option>
              <option>Hopeful</option>
            </select>
          </div>
        </div>

        <div className="two-col">
          <div className="field">
            <label htmlFor="f-sleep">Sleep hours (avg)</label>
            <input type="number" id="f-sleep" name="sleepHours" placeholder="6" min="0" max="24" step="0.5" />
          </div>
          <div className="field">
            <label htmlFor="f-stress">Stress level</label>
            <div className="slider-row">
              <input
                type="range"
                id="f-stress"
                name="stressLevel"
                min="1"
                max="10"
                defaultValue={5}
                onInput={(e) => setStressVal(e.target.value)}
              />
              <span className="slider-val">{stressVal}</span>
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-support">Support system</label>
          <select id="f-support" name="support" defaultValue="">
            <option value="">Select…</option>
            <option>Strong — I have people I trust</option>
            <option>Some — a few people, not always available</option>
            <option>Limited — mostly on my own</option>
            <option>None — I feel isolated</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="f-goals">Goals right now</label>
          <textarea
            id="f-goals"
            name="goals"
            placeholder="e.g. sleep better, stop comparing myself to others, feel less anxious at night"
          />
        </div>

        <ApiSettings
          backendUrl={backendUrl}
          onBackendUrlChange={onBackendUrlChange}
          model={model}
          onModelChange={onModelChange}
        />

        <button type="submit" id="submit-btn" className="submit" disabled={submitting}>
          {submitting ? 'Generating…' : 'Generate scenarios'}
        </button>
        <div className={`status-msg${status.type ? ' ' + status.type : ''}`}>{status.message}</div>
      </form>
    </section>
  );
}
