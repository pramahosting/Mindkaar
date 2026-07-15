"use client";

import { useState, useEffect, useRef } from "react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3"; // change to your model name

// ── Ollama fetch ──────────────────────────────────────────────────────────────
async function fetchScenario(userProfile = null, previousAnswer = null) {
  const context = previousAnswer
    ? `The user just answered a scenario. Their choice was: "${previousAnswer.chosenText}" which reflects the trait: "${previousAnswer.trait}". Generate a NEW and different scenario that builds on this insight.`
    : `This is the user's first scenario. Tailor it to this profile: ${JSON.stringify(userProfile)}.`;

  const prompt = `You are a mental health scenario generator. ${context}

Generate a thought-provoking life scenario to assess emotional and mental patterns.

Respond ONLY with valid JSON matching this exact schema. No preamble, no markdown fences, no explanation:
{
  "title": "short evocative scenario title",
  "difficulty": "X/6",
  "narrative": "2-3 sentence immersive scenario written in second person (you)",
  "options": [
    { "letter": "A", "text": "what the person does - full sentence", "trait": "TraitName" },
    { "letter": "B", "text": "what the person does - full sentence", "trait": "TraitName" },
    { "letter": "C", "text": "what the person does - full sentence", "trait": "TraitName" },
    { "letter": "D", "text": "what the person does - full sentence", "trait": "TraitName" }
  ]
}`;

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama responded with ${res.status}`);
  const data = await res.json();

  const raw = data.response.replace(/```json|```/g, "").trim();
  const jsonStart = raw.indexOf("{");
  const jsonEnd   = raw.lastIndexOf("}");
  return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
}

// ── Colour per option letter ──────────────────────────────────────────────────
const LETTER_STYLE = {
  A: { dot: "#4ade80", badge: "rgba(74,222,128,0.1)",   border: "rgba(74,222,128,0.25)",   text: "#4ade80"  },
  B: { dot: "#60a5fa", badge: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.25)",   text: "#60a5fa"  },
  C: { dot: "#c084fc", badge: "rgba(192,132,252,0.1)",  border: "rgba(192,132,252,0.25)",  text: "#c084fc"  },
  D: { dot: "#fbbf24", badge: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.25)",   text: "#fbbf24"  },
};
const fallbackStyle = { dot: "#94a3b8", badge: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", text: "#94a3b8" };
const style = (letter) => LETTER_STYLE[letter] || fallbackStyle;

// ── Difficulty dots ───────────────────────────────────────────────────────────
function DifficultyDots({ difficulty = "1/6" }) {
  const [current, total] = difficulty.split("/").map(Number);
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total || 6 }, (_, i) => (
        <div key={i} className="w-2 h-2 rounded-full"
          style={{ background: i < current ? "#4ade80" : "rgba(255,255,255,0.07)", border: "1px solid", borderColor: i < current ? "#4ade80" : "rgba(255,255,255,0.12)" }} />
      ))}
      <span className="text-xs font-mono ml-1" style={{ color: "#4ade80" }}>{difficulty}</span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-3 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="h-6 w-3/4 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="space-y-2">
        {[1, 0.85, 0.7].map((w, i) => (
          <div key={i} className="h-3 rounded" style={{ background: "rgba(255,255,255,0.04)", width: `${w * 100}%` }} />
        ))}
      </div>
      <div className="pt-2 space-y-2.5">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-14 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }} />
        ))}
      </div>
    </div>
  );
}

// ── History card ──────────────────────────────────────────────────────────────
function HistoryCard({ item, number }) {
  const [open, setOpen] = useState(false);
  const chosen = item.scenario.options.find(o => o.letter === item.answer);
  const s = style(item.answer);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-5 py-4 flex items-center gap-3">
        <span className="text-xs font-mono flex-shrink-0 w-6" style={{ color: "#334155" }}>
          {String(number).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#cbd5e1" }}>{item.scenario.title}</p>
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: s.badge, color: s.text, border: `1px solid ${s.border}` }}>
            {chosen?.trait}
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 transition-transform duration-200"
          style={{ color: "#334155", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-xs leading-relaxed pt-4 mb-4" style={{ color: "#475569" }}>{item.scenario.narrative}</p>
          <div className="space-y-2">
            {item.scenario.options.map(opt => {
              const isChosen = opt.letter === item.answer;
              const c = style(opt.letter);
              return (
                <div key={opt.letter} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: isChosen ? c.badge : "transparent", border: "1px solid", borderColor: isChosen ? c.border : "rgba(255,255,255,0.04)", opacity: isChosen ? 1 : 0.4 }}>
                  <span className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: isChosen ? c.dot : "rgba(255,255,255,0.06)", color: isChosen ? "#0a0f1a" : "#475569" }}>
                    {opt.letter}
                  </span>
                  <div>
                    <p className="text-xs leading-relaxed" style={{ color: isChosen ? "#e2e8f0" : "#475569" }}>{opt.text}</p>
                    {isChosen && <p className="text-xs mt-1 font-medium" style={{ color: c.text }}>✦ {opt.trait}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
export default function ScenarioPage({ userProfile = {} }) {
  const [tab, setTab]             = useState("scenario");
  const [scenario, setScenario]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [selected, setSelected]   = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [history, setHistory]     = useState([]);
  const [fading, setFading]       = useState(false);
  const isFirst = useRef(true);

  const loadNext = async (previousAnswer = null) => {
    setFading(true);
    await new Promise(r => setTimeout(r, 300));
    setLoading(true);
    setError("");
    setSelected(null);
    setConfirmed(false);
    setFading(false);
    try {
      const data = await fetchScenario(isFirst.current ? userProfile : null, previousAnswer);
      isFirst.current = false;
      setScenario(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNext(); }, []);

  const confirm = () => {
    if (!selected || confirmed) return;
    const chosen = scenario.options.find(o => o.letter === selected);
    setConfirmed(true);
    setHistory(prev => [...prev, { scenario, answer: selected }]);
    setTimeout(() => loadNext({ chosenText: chosen.text, trait: chosen.trait }), 2000);
  };

  const chosen = scenario?.options.find(o => o.letter === selected);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080d14", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4caf50,#81c784)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C12 21 4 13.5 4 8.5C4 5.42 6.42 3 9.5 3C11.04 3 12 4 12 4C12 4 12.96 3 14.5 3C17.58 3 20 5.42 20 8.5C20 13.5 12 21 12 21Z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Mental Gym</span>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-0.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { id: "scenario", label: "Scenario" },
            { id: "history",  label: history.length > 0 ? `History · ${history.length}` : "History" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: tab === t.id ? "rgba(255,255,255,0.09)" : "transparent", color: tab === t.id ? "#e2e8f0" : "#475569" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ width: 110 }} />
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-8">

          {/* SCENARIO TAB */}
          {tab === "scenario" && (
            <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.3s ease" }}>
              {loading ? <Skeleton /> : error ? (
                <div className="text-center py-20">
                  <p className="text-3xl mb-3">⚠️</p>
                  <p className="text-sm mb-1 font-medium" style={{ color: "#f1f5f9" }}>Couldn't reach Ollama</p>
                  <p className="text-xs mb-6" style={{ color: "#ef4444" }}>{error}</p>
                  <p className="text-xs mb-6" style={{ color: "#334155" }}>Make sure Ollama is running on port 11434</p>
                  <button onClick={() => loadNext()}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,#4caf50,#66bb6a)" }}>
                    Retry
                  </button>
                </div>
              ) : scenario && (
                <>
                  {/* Meta row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                      <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "#4ade80" }}>
                        Scenario {history.length + 1}
                      </span>
                    </div>
                    <DifficultyDots difficulty={scenario.difficulty} />
                  </div>

                  {/* Title */}
                  <h1 className="text-xl font-bold mb-4 leading-snug" style={{ color: "#f1f5f9", letterSpacing: "-0.02em" }}>
                    {scenario.title}
                  </h1>

                  {/* Narrative */}
                  <p className="text-sm mb-7" style={{ color: "#64748b", lineHeight: "1.85" }}>
                    {scenario.narrative}
                  </p>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <span className="text-xs" style={{ color: "#1e293b" }}>How do you respond?</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>

                  {/* Options */}
                  <div className="space-y-2 mb-6">
                    {scenario.options.map(opt => {
                      const isSelected  = selected === opt.letter;
                      const isConfirmed = confirmed && isSelected;
                      const isDimmed    = confirmed && !isSelected;
                      const s           = style(opt.letter);
                      return (
                        <button key={opt.letter} disabled={confirmed}
                          onClick={() => setSelected(opt.letter)}
                          className="w-full text-left rounded-xl transition-all duration-150"
                          style={{
                            padding: "13px 15px",
                            background:   isConfirmed ? s.badge : isSelected ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.02)",
                            border:       "1px solid",
                            borderColor:  isConfirmed ? s.border : isSelected ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
                            opacity:      isDimmed ? 0.2 : 1,
                            cursor:       confirmed ? "default" : "pointer",
                            transform:    isSelected && !confirmed ? "translateY(-1px)" : "none",
                          }}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 transition-all"
                              style={{ background: isSelected ? s.dot : "rgba(255,255,255,0.06)", color: isSelected ? "#080d14" : "#334155" }}>
                              {opt.letter}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed" style={{ color: isSelected ? "#e2e8f0" : "#475569" }}>
                                {opt.text}
                              </p>
                              {isConfirmed && (
                                <p className="text-xs mt-2 font-medium" style={{ color: s.text }}>✦ {opt.trait}</p>
                              )}
                            </div>
                            {isSelected && !confirmed && (
                              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                                style={{ background: s.dot }}>
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4l1.5 1.5 3.5-3.5" stroke="#080d14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* CTA / confirmed state */}
                  {!confirmed ? (
                    <button onClick={confirm} disabled={!selected}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-20"
                      style={{
                        background:  selected ? "linear-gradient(135deg,#4caf50,#66bb6a)" : "rgba(255,255,255,0.04)",
                        color:       selected ? "#fff" : "#1e293b",
                        border:      "1px solid",
                        borderColor: selected ? "transparent" : "rgba(255,255,255,0.05)",
                      }}>
                      {selected ? "Lock in answer" : "Choose a response"}
                    </button>
                  ) : (
                    <div className="rounded-xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)" }}>
                      <div>
                        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "#4ade80" }}>Pattern noted</p>
                        <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>{chosen?.trait}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#334155" }}>Generating next scenario…</p>
                      </div>
                      <svg className="animate-spin w-5 h-5 ml-auto flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="rgba(74,222,128,0.2)" strokeWidth="2.5"/>
                        <path d="M12 3a9 9 0 019 9" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {tab === "history" && (
            history.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-3xl mb-3">🌿</p>
                <p className="text-sm font-medium mb-1" style={{ color: "#e2e8f0" }}>No answers yet</p>
                <p className="text-xs mb-5" style={{ color: "#334155" }}>Complete a scenario to see your response history here.</p>
                <button onClick={() => setTab("scenario")} className="text-xs font-medium" style={{ color: "#4ade80" }}>
                  Start now →
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-semibold" style={{ color: "#e2e8f0" }}>Response history</h2>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.15)" }}>
                    {history.length} answered
                  </span>
                </div>

                {/* Trait pills */}
                {(() => {
                  const traits = [...new Set(history.map(h => h.scenario.options.find(o => o.letter === h.answer)?.trait).filter(Boolean))];
                  return traits.length > 0 && (
                    <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <p className="text-xs uppercase tracking-widest mb-2.5" style={{ color: "#1e293b" }}>Emerging patterns</p>
                      <div className="flex flex-wrap gap-2">
                        {traits.map(t => (
                          <span key={t} className="text-xs px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2.5">
                  {[...history].reverse().map((item, i) => (
                    <HistoryCard key={i} item={item} number={history.length - i} />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
