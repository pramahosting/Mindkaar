/**
 * Defensive JSON parsing — handles the backend already returning parsed
 * JSON, markdown-fenced text, or the occasional malformed payload.
 */
export function tryParseJson(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;

  let text = raw.trim();
  if (!text) return null;

  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const attempts = [text, text.replace(/\{\{/g, '{').replace(/\}\}/g, '}')];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      /* try next */
    }
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    for (const attempt of [match[0], match[0].replace(/\{\{/g, '{').replace(/\}\}/g, '}')]) {
      try {
        return JSON.parse(attempt);
      } catch (e) {
        /* keep trying */
      }
    }
  }
  return null;
}

/**
 * Accepts {key: [...]}, a bare array, a JSON-encoded string of either, or a
 * single item — always returns a plain array.
 */
export function normalizeList(data, key) {
  if (!data) return [];
  if (typeof data === 'string') return normalizeList(tryParseJson(data), key);
  if (Array.isArray(data)) return data.filter(Boolean);
  if (data[key]) {
    return Array.isArray(data[key]) ? data[key].filter(Boolean) : [data[key]];
  }
  return [];
}

export function topicName(t) {
  if (typeof t === 'string') return t || 'Untitled topic';
  if (t && typeof t === 'object') return t.topic || t.title || t.name || 'Untitled topic';
  return 'Untitled topic';
}

export function topicDescription(t) {
  if (t && typeof t === 'object') return t.description || t.summary || '';
  return '';
}

/** Stable key for a topic: prefer its own id, fall back to its position. */
export function topicKey(t, fallbackIndex) {
  if (t && typeof t === 'object' && t.id !== undefined && t.id !== null && t.id !== '') {
    return String(t.id);
  }
  if (typeof t === 'string') return 'topic-' + t;
  return 'idx-' + fallbackIndex;
}

/** Normalizes a difficulty value (number, "3/6" string, or missing) into
 * { filled, total } dots. Returns null if there's nothing to show. */
export function difficultyDots(diffVal, defaultTotal = 6) {
  if (diffVal === null || diffVal === undefined) return null;

  let filled = 0;
  let total = defaultTotal;

  if (typeof diffVal === 'string' && diffVal.includes('/')) {
    const [a, b] = diffVal.split('/').map((s) => parseInt(s.trim(), 10));
    if (!isNaN(a)) filled = a;
    if (!isNaN(b) && b > 0) total = b;
  } else if (typeof diffVal === 'number' && !isNaN(diffVal)) {
    filled = diffVal;
  } else {
    return null;
  }

  filled = Math.max(0, Math.min(filled, total));
  return { filled, total };
}
