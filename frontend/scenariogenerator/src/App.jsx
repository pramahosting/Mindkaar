import { useRef, useState } from 'react';
import ProfileForm from './components/ProfileForm.jsx';
import TopicList from './components/TopicList.jsx';
import QuestionPanel from './components/QuestionPanel.jsx';
import { DEFAULT_BACKEND_URL } from './api.js';
import { useScenarios } from './hooks/useScenarios.js';

export default function App() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [model, setModel] = useState('openai/gpt-oss-120b');

  // Keep the last-submitted profile around so a topic click (which needs
  // the profile too) doesn't require re-reading the form.
  const lastProfileRef = useRef(null);

  const {
    topics,
    activeKey,
    status,
    submitting,
    questionCache,
    questionState,
    questionError,
    generateTopics,
    selectTopic,
    retryTopic,
  } = useScenarios({ baseUrl: backendUrl, model });

  function handleFormSubmit(profile) {
    lastProfileRef.current = profile;
    generateTopics(profile);
  }

  function handleSelectTopic(key, index) {
    selectTopic(key, index, lastProfileRef.current || {});
  }

  function handleRetry() {
    retryTopic(lastProfileRef.current || {});
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="moon">☾</span>
          <h1>Quiet Hours</h1>
        </div>
        <p>reflection scenarios, generated from your baseline</p>
      </header>

      <div className="grid">
        <ProfileForm
          onSubmit={handleFormSubmit}
          submitting={submitting}
          status={status}
          backendUrl={backendUrl}
          onBackendUrlChange={setBackendUrl}
          model={model}
          onModelChange={setModel}
        />

        <TopicList
          topics={topics}
          activeKey={activeKey}
          questionState={questionState}
          onSelect={handleSelectTopic}
        />

        <QuestionPanel
          activeKey={activeKey}
          topics={topics}
          questionState={questionState}
          questionCache={questionCache}
          questionError={questionError}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
}
