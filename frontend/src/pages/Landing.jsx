import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Target, Gamepad2, Mic, CheckCircle2, ArrowRight,
  Shield, Ban, TrendingUp, Sparkles, Zap, Clock,
  Twitter, Linkedin, Mail,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import './landing.css'

const GROUPS = [
  {
    label: 'Understand yourself',
    tag: 'Find your starting point',
    color: 'var(--violet-500)',
    bgTag: 'rgba(124,92,255,.12)',
    modules: [
      {
        id: 'checkin',
        icon: ClipboardList,
        color: '#7C5CFF',
        bg: 'rgba(124,92,255,.12)',
        name: 'Check-in',
        tagline: 'A 5-minute check-in that actually listens',
        desc: 'Twenty-four short questions across six everyday domains — stress, anxiety, conflict, unrest, burnout, loneliness. Answered on a familiar frequency scale, not a mood ring.',
        features: [
          '6 domains, 4 questions each',
          'The same 4-point scale used by PSS-10 / GAD-7-style screeners',
          'About 5 minutes, no essay questions',
          'Retake it anytime things change',
        ],
      },
      {
        id: 'scenario',
        icon: Target,
        color: '#FF6B5B',
        bg: 'rgba(255,107,91,.12)',
        name: 'Scenario match',
        tagline: 'Matched to the one thing weighing on you most',
        desc: 'Every domain gets scored from your own answers and lined up side by side, so you see exactly why a scenario was picked — not just told what it is.',
        features: [
          'Deterministic scoring — no LLM guesswork',
          'Ranked against every other domain, not just the winner',
          "Grounded in your own highest-scoring answer",
          'Gives the same result if you check twice',
        ],
      },
    ],
  },
  {
    label: 'Build the skill',
    tag: 'Practice, not theory',
    color: 'var(--teal-500)',
    bgTag: 'rgba(34,211,172,.14)',
    modules: [
      {
        id: 'games',
        icon: Gamepad2,
        color: '#FFC857',
        bg: 'rgba(255,200,87,.16)',
        name: 'Mini-games',
        tagline: "A game that gets harder as you get better",
        desc: 'Chopping Vegetables, Calm Breathing, and more — short, replayable, scenario-flavored games with three lives and difficulty that climbs with you.',
        features: [
          'Difficulty rises with your level',
          'Three lives — plays until you fail',
          'Progress only ever goes up, never resets',
          'Every scenario offers more than one game to try',
        ],
      },
      {
        id: 'roleplay',
        icon: Mic,
        color: '#38BDF8',
        bg: 'rgba(56,189,248,.14)',
        name: 'Voice roleplay',
        tagline: 'A real conversation, before the real one',
        desc: 'Speak with an AI character whose anger, trust and calm shift live as you respond. Off-topic replies get flagged, not silently accepted.',
        features: [
          'Browser mic in, spoken replies out — or just type',
          'Live empathy & de-escalation scoring per turn',
          'An emotion-journey chart at the end of the session',
          'Four characters, four situations people actually dread',
        ],
      },
    ],
  },
]

const STATS = [
  { value: '6', label: 'Domains checked in on' },
  { value: '24', label: 'Questions, ~5 minutes' },
  { value: '4', label: 'AI roleplay partners' },
  { value: '∞', label: 'Replays — levels only climb' },
]

const WHY = [
  { icon: Shield, color: '#7C5CFF', bg: 'rgba(124,92,255,.12)', title: 'Private by default', text: 'Every session is tied to your account. No one else — not even other users — can see your check-in or your transcripts.' },
  { icon: Ban, color: '#FF6B5B', bg: 'rgba(255,107,91,.12)', title: 'No diagnoses, no labels', text: "Mindkaar reads patterns, not people. It's a practice space, not a clinical assessment or a stand-in for therapy." },
  { icon: TrendingUp, color: '#FFC857', bg: 'rgba(255,200,87,.16)', title: 'Progress that only climbs', text: 'Restarting a game replays it from level one — it never erases your best score. Your progress is a floor, not a reset button.' },
  { icon: Sparkles, color: '#22D3AC', bg: 'rgba(34,211,172,.14)', title: 'Grounded, not generic', text: 'Scenarios come from your own answers, and the intake borrows its structure from established screeners — paraphrased, never copied.' },
  { icon: Zap, color: '#38BDF8', bg: 'rgba(56,189,248,.14)', title: 'Keeps working either way', text: "If the AI service is ever unavailable, scoring and character responses fall back to a fixed, dependable result. Nothing breaks." },
  { icon: Clock, color: '#F472B6', bg: 'rgba(244,114,182,.14)', title: 'Practice at your pace', text: 'Pause a scenario, revisit a reflection question, or replay a level any time. Nothing is timed except the games themselves.' },
]

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lp-navdrop" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`lp-navdrop-btn ${open ? 'open' : ''}`}>
        {label}
        <span style={{ fontSize: 9, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
      </button>
      {open && (
        <div className="lp-navdrop-menu">
          {items.map((m) => (
            <a key={m.id} href={`#${m.id}`} className="lp-navdrop-item">
              <span className="lp-navdrop-dot" style={{ background: m.color }} />
              {m.name}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function ScenarioMock() {
  const rows = [
    { label: 'Stress', val: 82, color: '#7C5CFF' },
    { label: 'Burnout', val: 67, color: '#FF6B5B' },
    { label: 'Anxiety', val: 54, color: '#FFC857' },
    { label: 'Conflict', val: 38, color: '#22D3AC' },
  ]
  return (
    <div className="lp-mock">
      <div className="lp-mock-head">
        <div className="lp-mock-icon" style={{ background: 'rgba(255,107,91,.14)' }}><Target size={20} color="#FF6B5B" /></div>
        <div><b>Your scenario scores</b><span>Computed from your check-in</span></div>
        <span className="lp-mock-live">Matched</span>
      </div>
      {rows.map((r) => (
        <div className="lp-mock-bar-row" key={r.label}>
          <span className="lp-mock-bar-label">{r.label}</span>
          <div className="lp-mock-bar-track"><div className="lp-mock-bar-fill" style={{ width: `${r.val}%`, background: r.color }} /></div>
          <span className="lp-mock-bar-val" style={{ color: r.color }}>{r.val}%</span>
        </div>
      ))}
    </div>
  )
}

function CheckinMock() {
  return (
    <div className="lp-mock">
      <div className="lp-mock-head">
        <div className="lp-mock-icon" style={{ background: 'rgba(124,92,255,.14)' }}><ClipboardList size={20} color="#7C5CFF" /></div>
        <div><b>Check-in · Stress</b><span>Question 3 of 24</span></div>
      </div>
      <div className="lp-mock-q">"I've felt like things were piling up faster than I could handle."</div>
      <div className="lp-mock-opts">
        <div className="lp-mock-opt">Never</div>
        <div className="lp-mock-opt">Sometimes</div>
        <div className="lp-mock-opt sel">Often</div>
        <div className="lp-mock-opt">Almost always</div>
      </div>
    </div>
  )
}

function GameMock() {
  return (
    <div className="lp-mock">
      <div className="lp-mock-head">
        <div className="lp-mock-icon" style={{ background: 'rgba(255,200,87,.18)' }}><Gamepad2 size={20} color="#e69a06" /></div>
        <div><b>Calm Breathing</b><span>Stress-flavored session</span></div>
        <span className="lp-mock-live">In progress</span>
      </div>
      <div className="lp-mock-hud">
        <span className="lp-mock-hud-lvl">Level 4</span>
        <span className="lp-mock-hearts">♥ ♥ <span className="dim">♥</span></span>
      </div>
      <div className="lp-mock-progress-track"><div className="lp-mock-progress-fill" /></div>
      <span className="lp-mock-score">Best score: 1,240 · this run: 860</span>
    </div>
  )
}

function VoiceMock() {
  const rows = [
    { label: 'Trust', val: 71, color: '#22D3AC' },
    { label: 'Calm', val: 58, color: '#38BDF8' },
    { label: 'Anger', val: 22, color: '#FF6B5B' },
  ]
  return (
    <div className="lp-mock">
      <div className="lp-mock-head">
        <div className="lp-mock-icon" style={{ background: 'rgba(56,189,248,.14)' }}><Mic size={20} color="#38BDF8" /></div>
        <div><b>Alex · Angry Customer</b><span>Turn 5 of 8</span></div>
        <span className="lp-mock-live">Live</span>
      </div>
      <div className="lp-mock-bubble">"Okay — I get why that was frustrating. Let's find a way to actually fix it."</div>
      {rows.map((r) => (
        <div className="lp-mock-emotion-row" key={r.label}>
          <span className="lp-mock-emotion-label">{r.label}</span>
          <div className="lp-mock-emotion-track"><div className="lp-mock-emotion-fill" style={{ width: `${r.val}%`, background: r.color }} /></div>
        </div>
      ))}
    </div>
  )
}

const MOCKS = { checkin: CheckinMock, scenario: ScenarioMock, games: GameMock, roleplay: VoiceMock }

function ModuleRow({ m, reversed }) {
  const Icon = m.icon
  const Mock = MOCKS[m.id]
  return (
    <div className={`lp-module ${reversed ? 'rev' : ''}`} id={m.id}>
      <div>
        <div className="lp-module-chip" style={{ background: m.bg, color: m.color }}>
          <Icon size={13} /> {m.name}
        </div>
        <h3>{m.tagline}</h3>
        <p className="lp-module-desc">{m.desc}</p>
        <ul className="lp-module-list">
          {m.features.map((f) => (
            <li key={f}><CheckCircle2 size={16} color={m.color} /> {f}</li>
          ))}
        </ul>
      </div>
      <div><Mock /></div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const allModules = GROUPS.flatMap((g) => g.modules)

  return (
    <div className="lp">
      {/* Nav */}
      <nav className="lp-nav">
        <Logo size={32} />
        <div className="lp-nav-links">
          <NavDropdown label="Understand yourself" items={GROUPS[0].modules} />
          <NavDropdown label="Build the skill" items={GROUPS[1].modules} />
          <div className="lp-nav-divider" />
        </div>
        <div className="lp-nav-cta">
          <button className="lp-btn lp-btn-outline lp-btn-sm" onClick={() => navigate('/login')}>Sign in</button>
          <button className="lp-btn lp-btn-primary lp-btn-sm" onClick={() => navigate('/register')}>Get started</button>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-hero-badge"><Sparkles size={12} /> A judgment-free training ground</div>
        <h1>
          Train your mind <span className="lp-grad">like it's a muscle.</span>
        </h1>
        <p className="lp-lede">
          One place to check in on how you're actually doing, get matched to what's really going
          on, and practice it — through a game you can get better at, and a real conversation
          you can rehearse out loud.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn lp-btn-primary" onClick={() => navigate('/register')}>
            Start your free check-in <ArrowRight size={16} />
          </button>
          <button className="lp-btn lp-btn-outline" onClick={() => navigate('/login')}>
            I already have an account
          </button>
        </div>
        <div className="lp-hero-stats">
          {STATS.map((s) => (
            <div className="lp-hero-stat" key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
          ))}
        </div>
      </header>

      {/* Modules */}
      <section className="lp-section lp-wrap">
        <div className="lp-section-head">
          <div className="lp-eyebrow" style={{ color: 'var(--violet-500)' }}>Four tools, one profile</div>
          <h2>Everything feeds the next step</h2>
          <p>
            Grouped below by what they help you do first: <strong>understand</strong> what's going on,
            then <strong>build</strong> the skill for it. They share your one profile, so nothing you do resets.
          </p>
        </div>

        {GROUPS.map((g) => (
          <div key={g.label} style={{ marginBottom: 96 }}>
            <div className="lp-group-head">
              <span className="lp-group-label">{g.label}</span>
              <span className="lp-group-tag" style={{ color: g.color, background: g.bgTag }}>{g.tag}</span>
              <span className="lp-group-rule" />
            </div>
            {g.modules.map((m, i) => (
              <ModuleRow key={m.id} m={m} reversed={i % 2 === 1} />
            ))}
          </div>
        ))}
      </section>

      {/* Why */}
      <section className="lp-why">
        <div className="lp-section lp-wrap">
          <div className="lp-section-head">
            <div className="lp-eyebrow" style={{ color: 'var(--rose-500)' }}>Worth knowing</div>
            <h2>Why Mindkaar, and not just a mood-tracking app</h2>
            <p>Built for the days you'd rather not deal with, but do anyway — without turning your feelings into a SaaS dashboard.</p>
          </div>
          <div className="lp-why-grid">
            {WHY.map((w) => {
              const Icon = w.icon
              return (
                <div className="lp-why-card" key={w.title}>
                  <div className="lp-why-icon" style={{ background: w.bg }}><Icon size={20} color={w.color} /></div>
                  <h4>{w.title}</h4>
                  <p>{w.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta-band">
        <h2>Your mind deserves reps too.</h2>
        <p>Start with the check-in — it takes about five minutes, and it's the only step that's the same for everyone.</p>
        <div className="lp-cta-ctas">
          <button className="lp-btn lp-btn-dark" onClick={() => navigate('/register')}>
            Create your free account <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Logo size={30} light />
              <p>A personalized mental-wellness training ground: check in, get matched to a scenario, and build the real skill for it through games and AI roleplay.</p>
              <div className="lp-footer-social">
                <a href="#" aria-label="Twitter"><Twitter size={15} /></a>
                <a href="#" aria-label="LinkedIn"><Linkedin size={15} /></a>
                <a href="#" aria-label="Email"><Mail size={15} /></a>
              </div>
            </div>
            <div>
              <div className="lp-footer-col-title">Explore</div>
              {allModules.map((m) => (
                <a key={m.id} href={`#${m.id}`} className="lp-footer-link">{m.name}</a>
              ))}
            </div>
            <div>
              <div className="lp-footer-col-title">Account</div>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/login') }} className="lp-footer-link">Sign in</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register') }} className="lp-footer-link">Create account</a>
            </div>
            <div>
              <div className="lp-footer-col-title">Built with</div>
              <div className="lp-footer-static">React + Vite</div>
              <div className="lp-footer-static">FastAPI + SQLite</div>
              <div className="lp-footer-static">Groq-powered AI</div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Mindkaar. A practice space, not a clinic.</span>
            <span>Made for the days you'd rather not deal with, but do anyway.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
