const MODEL_OPTIONS = [
  { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b (best quality, structured output)' },
  { value: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b (fastest, structured output)' },
  { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
  { value: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'meta-llama/llama-4-scout-17b-16e-instruct' },
  { value: 'qwen/qwen3-32b', label: 'qwen/qwen3-32b' },
];

export default function ApiSettings({ backendUrl, onBackendUrlChange, model, onModelChange }) {
  return (
    <details className="endpoint" id="api-settings">
      <summary>API settings</summary>
      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="f-backend-url">Backend URL</label>
        <input
          type="text"
          id="f-backend-url"
          value={backendUrl}
          onChange={(e) => onBackendUrlChange(e.target.value)}
          placeholder="http://localhost:8000"
        />
      </div>
      <div className="field">
        <label htmlFor="f-groq-model">Model</label>
        <select id="f-groq-model" value={model} onChange={(e) => onModelChange(e.target.value)}>
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </details>
  );
}
