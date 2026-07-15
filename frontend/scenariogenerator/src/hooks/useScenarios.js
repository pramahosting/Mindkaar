import { useCallback, useState } from 'react';
import { fetchQuestions, fetchTopics } from '../api.js';
import { topicKey, topicName } from '../utils.js';

const TOPIC_TIMEOUT_MS = 45000;
const QUESTIONS_TIMEOUT_MS = 60000; // 10 full questions per topic can take a while

export function useScenarios({ baseUrl, model }) {
  const [topics, setTopics] = useState([]);
  const [activeKey, setActiveKey] = useState(null);

  const [status, setStatus] = useState({ message: '', type: null });
  const [submitting, setSubmitting] = useState(false);

  // key -> array of 10 question objects
  const [questionCache, setQuestionCache] = useState({});
  // key -> 'loading' | 'error' | 'timeout' | 'ready'
  const [questionState, setQuestionState] = useState({});
  // key -> the actual error message, so failures are diagnosable
  const [questionError, setQuestionError] = useState({});

  const fetchQuestionsForTopic = useCallback(
    async (key, topic, profile) => {
      setQuestionState((prev) => ({ ...prev, [key]: 'loading' }));

      try {
        const questions = await fetchQuestions({
          baseUrl,
          profile,
          topic: topicName(topic),
          model,
          timeoutMs: QUESTIONS_TIMEOUT_MS,
        });
        setQuestionCache((prev) => ({ ...prev, [key]: questions }));
        setQuestionState((prev) => ({ ...prev, [key]: 'ready' }));
        setQuestionError((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch (err) {
        console.error(`Failed to fetch questions for topic "${topicName(topic)}":`, err);
        setQuestionCache((prev) => ({ ...prev, [key]: null }));
        setQuestionState((prev) => ({
          ...prev,
          [key]: err && err.code === 'TIMEOUT' ? 'timeout' : 'error',
        }));
        setQuestionError((prev) => ({
          ...prev,
          [key]: (err && err.message) || 'Something went wrong loading this topic.',
        }));
      }
    },
    [baseUrl, model]
  );

  const selectTopic = useCallback(
    (key, index, profile) => {
      setActiveKey(key);

      // Already loaded (or currently loading) — just show it, don't refetch.
      const state = questionState[key];
      if (state === 'ready' || state === 'loading') return;

      fetchQuestionsForTopic(key, topics[index], profile);
    },
    [topics, questionState, fetchQuestionsForTopic]
  );

  const retryTopic = useCallback(
    (profile) => {
      if (activeKey === null) return;
      const idx = topics.findIndex((t, i) => topicKey(t, i) === activeKey);
      if (idx > -1) fetchQuestionsForTopic(activeKey, topics[idx], profile);
    },
    [activeKey, topics, fetchQuestionsForTopic]
  );

  const generateTopics = useCallback(
    async (profile) => {
      setSubmitting(true);
      setStatus({ message: 'Asking the server for topics tailored to your profile…', type: null });

      setActiveKey(null);
      setQuestionCache({});
      setQuestionState({});
      setQuestionError({});

      try {
        const list = await fetchTopics({ baseUrl, profile, model, timeoutMs: TOPIC_TIMEOUT_MS });
        setTopics(list);
        setStatus({
          message: `Got ${list.length} topic${list.length === 1 ? '' : 's'} back. Click one to load its questions.`,
          type: 'ok',
        });
      } catch (err) {
        console.error('Topic generation failed:', err);
        setTopics([]);
        setStatus({ message: err.message || 'Something went wrong talking to the server.', type: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
    [baseUrl, model]
  );

  return {
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
  };
}
