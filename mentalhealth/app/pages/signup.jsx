import { useState } from "react";
const MOODS = ["😊 Great", "🙂 Good", "😐 Okay", "😔 Low", "😞 Struggling"];

export default function SignupPage({ onSwitch }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    mood: "",
    sleepHours: "",
    stressLevel: "",
    support: [],
    goals: [],
  });
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleArr = (field, val) => {
    const arr = form[field];
    setForm({ ...form, [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const inputStyle = (val) => ({
    background: "#f4faf6",
    borderColor: val ? "#81c784" : "#dce8e0",
    color: "#1b3a2d",
  });

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border";
  const labelClass = "block text-xs font-medium mb-1.5 tracking-wide uppercase";

  const supportOptions = ["Therapy", "Medication", "Support group", "Friends & family", "None currently"];
  const goalOptions = ["Reduce anxiety", "Better sleep", "Manage stress", "Build resilience", "Improve mood", "Find purpose"];

  const Chip = ({ label, selected, onClick }) => (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border"
      style={{
        background: selected ? "#e8f5e9" : "transparent",
        borderColor: selected ? "#4caf50" : "#dce8e0",
        color: selected ? "#2e7d32" : "#7a9a8a",
      }}
    >
      {label}
    </button>
  );

  const submit = async () => {
    try {
      const payload = {
        // Account fields
        name:        form.name,
        email:       form.email,
        password:    form.password,
        age:         form.age ? Number(form.age) : null,
        // Mental health baseline
        mood:        form.mood,
        sleepHours:  form.sleepHours ? Number(form.sleepHours) : null,
        stressLevel: Number(form.stressLevel),
        support:     form.support,
        goals:       form.goals,
      };
      setDone(false)
      setStep(1); 
      setForm({ name:"",email:"",password:"",age:"",mood:"",sleepHours:"",stressLevel:"5",support:[],goals:[] })
      console.log("Signup payload:", payload);   // handy during dev

    //   const data = await apiCall(ENDPOINTS.signup, payload);
    //   console.log("Signup response:", data);

    //   if (data.token) localStorage.setItem("token", data.token);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      //setLoading(false);
    }
  };


  const StressSlider = () => (
    <div>
      <label className={labelClass} style={{ color: "#5a7a6a" }}>Current stress level</label>
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: "#7a9a8a" }}>Low</span>
        <input
          type="range" min="1" max="10" name="stressLevel"
          value={form.stressLevel || 5}
          onChange={handle}
          className="flex-1 accent-green-500"
        />
        <span className="text-xs" style={{ color: "#7a9a8a" }}>High</span>
        <span className="w-7 text-center text-sm font-semibold" style={{ color: "#2e7d32" }}>{form.stressLevel || 5}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-10" style={{ background: "linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 40%, #e3f0fb 100%)" }}>
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-30 blur-3xl" style={{ background: "#a8d5b5" }} />
      <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: "#90caf9" }} />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-md" style={{ background: "linear-gradient(135deg, #4caf50, #81c784)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C12 21 4 13.5 4 8.5C4 5.42 6.42 3 9.5 3C11.04 3 12 4 12 4C12 4 12.96 3 14.5 3C17.58 3 20 5.42 20 8.5C20 13.5 12 21 12 21Z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#1b3a2d" }}>Mental Gym</h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a6a" }}>Your mental wellness companion</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-5 px-1">
          {[1, 2].map(s => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{ background: s <= step ? "#4caf50" : "#d4e8da" }} />
          ))}
        </div>

        <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-3xl shadow-xl px-8 py-9 border border-white border-opacity-60">
          {done ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🌱</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#1b3a2d" }}>You're all set, {form.name.split(" ")[0]}!</h2>
              <p className="text-sm mb-4" style={{ color: "#5a7a6a" }}>
                Your wellness journey starts here. We'll tailor everything to how you're feeling.
              </p>
              <button onClick={() => { setDone(false); setStep(1); setForm({ name:"",email:"",password:"",age:"",mood:"",sleepHours:"",stressLevel:"5",support:[],goals:[] }); }}
               className="mt-2 text-sm underline" style={{ color: "#4caf50" }}>Start over</button>
            </div>
          ) : step === 1 ? (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "#1b3a2d" }}>Create your account</h2>
              <p className="text-sm mb-7" style={{ color: "#7a9a8a" }}>Step 1 of 2 — the basics</p>

              <div className="space-y-4">
                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>Full name</label>
                  <input name="name" value={form.name} onChange={handle} placeholder="Alex Rivera" className={inputClass} style={inputStyle(form.name)}
                    onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = form.name ? "#81c784" : "#dce8e0"} />
                </div>

                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" className={inputClass} style={inputStyle(form.email)}
                    onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = form.email ? "#81c784" : "#dce8e0"} />
                </div>

                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>Password</label>
                  <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" className={inputClass} style={inputStyle(form.password)}
                    onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = form.password ? "#81c784" : "#dce8e0"} />
                </div>

                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>Age</label>
                  <input name="age" type="number" value={form.age} onChange={handle} placeholder="25" className={inputClass} style={inputStyle(form.age)}
                    onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = form.age ? "#81c784" : "#dce8e0"} />
                  <p className="text-xs mt-1.5" style={{ color: "#9ab5a7" }}>Used only to tailor age-appropriate support resources.</p>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white mt-2 shadow-md transition-opacity"
                  style={{ background: "linear-gradient(135deg, #4caf50, #66bb6a)" }}
                  onMouseEnter={e => e.target.style.opacity = "0.92"} onMouseLeave={e => e.target.style.opacity = "1"}
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "#1b3a2d" }}>How are you doing?</h2>
              <p className="text-sm mb-6" style={{ color: "#7a9a8a" }}>Step 2 of 2 — your wellbeing baseline</p>

              <div className="space-y-6">
                {/* Mood */}
                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>How are you feeling today?</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {MOODS.map(m => (
                      <Chip key={m} label={m} selected={form.mood === m} onClick={() => setForm({ ...form, mood: m })} />
                    ))}
                  </div>
                </div>

                {/* Sleep */}
                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>Average sleep (hours/night)</label>
                  <input name="sleepHours" type="number" min="0" max="24" value={form.sleepHours} onChange={handle} placeholder="7"
                    className={inputClass} style={inputStyle(form.sleepHours)}
                    onFocus={e => e.target.style.borderColor = "#4caf50"} onBlur={e => e.target.style.borderColor = form.sleepHours ? "#81c784" : "#dce8e0"} />
                </div>

                {/* Stress */}
                <StressSlider />

                {/* Support */}
                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>Current support (select all that apply)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {supportOptions.map(o => (
                      <Chip key={o} label={o} selected={form.support.includes(o)} onClick={() => toggleArr("support", o)} />
                    ))}
                  </div>
                </div>

                {/* Goals */}
                <div>
                  <label className={labelClass} style={{ color: "#5a7a6a" }}>What brings you here?</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {goalOptions.map(o => (
                      <Chip key={o} label={o} selected={form.goals.includes(o)} onClick={() => toggleArr("goals", o)} />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all"
                    style={{ borderColor: "#dce8e0", color: "#5a7a6a" }}>Back</button>
                  <button onClick={() => {submit()}}
                    className="flex-2 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-md transition-opacity"
                    style={{ background: "linear-gradient(135deg, #4caf50, #66bb6a)", flex: 2 }}
                    onMouseEnter={e => e.target.style.opacity = "0.92"} onMouseLeave={e => e.target.style.opacity = "1"}
                  >
                    Start my journey
                  </button>
                </div>
              </div>
            </>
          )}

          {!done && (
            <p className="text-center text-sm mt-7" style={{ color: "#7a9a8a" }}>
              Already have an account?{" "}
              <span onClick={onSwitch} className="font-medium cursor-pointer" style={{ color: "#4caf50" }}>Sign in</span>
            </p>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#9ab5a7" }}>
          Your answers are private and encrypted. We never share your data.
        </p>
      </div>
    </div>
  );
}