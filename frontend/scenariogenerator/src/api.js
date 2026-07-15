import { normalizeList, tryParseJson } from './utils.js';

const DEFAULT_BACKEND_URL = 'http://localhost:8000';

export function normalizedBaseUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : DEFAULT_BACKEND_URL;
}

/**
 * Calls one POST endpoint on the FastAPI backend and returns the array
 * found under `resultKey`. Every failure mode becomes a distinct, labeled
 * Error (`err.code`) so the UI can show a specific, actionable message
 * instead of a generic "something went wrong".
 */
export async function callBackend({ baseUrl, path, body, timeoutMs, resultKey }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(normalizedBaseUrl(baseUrl) + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (networkErr) {
    if (networkErr && networkErr.name === 'AbortError') {
      const e = new Error("The server didn't respond in time.");
      e.code = 'TIMEOUT';
      throw e;
    }
    console.error('Network error calling backend:', networkErr);
    const e = new Error(
      `Could not reach the API at ${normalizedBaseUrl(baseUrl)}. Is the FastAPI server running?`
    );
    e.code = 'NETWORK_ERROR';
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const raw = await res.text();
  const payload = tryParseJson(raw);

  if (!res.ok) {
    console.error(`Backend error (${res.status}):`, raw);
    const detail = payload && payload.detail;
    const message =
      (detail && detail.error) ||
      (typeof detail === 'string' ? detail : null) ||
      `Server responded with status ${res.status}.`;
    const e = new Error(message);
    e.code = (detail && detail.code) || 'API_ERROR';
    throw e;
  }

  if (payload === null) {
    console.error('Backend response was not valid JSON:', raw.slice(0, 500));
    const e = new Error("The server's response wasn't valid JSON.");
    e.code = 'PARSE_ERROR';
    throw e;
  }

  const list = normalizeList(payload, resultKey);
  if (!list.length) {
    console.error(`Backend returned JSON but no "${resultKey}" were found in it:`, payload);
    const e = new Error(`The server didn't return any ${resultKey}.`);
    e.code = 'EMPTY_RESPONSE';
    throw e;
  }

  return list;
}

export function fetchTopics({ baseUrl, profile, model, timeoutMs }) {
  return callBackend({
    baseUrl,
    path: '/api/topics',
    body: { profile, model },
    timeoutMs,
    resultKey: 'topics',
  });
}

export function fetchQuestions({ baseUrl, profile, topic, model, timeoutMs }) {
  return callBackend({
    baseUrl,
    path: '/api/questions',
    body: { profile, topic, model },
    timeoutMs,
    resultKey: 'questions',
  });
}

export { DEFAULT_BACKEND_URL };
