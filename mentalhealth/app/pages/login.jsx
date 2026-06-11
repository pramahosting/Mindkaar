"use client";

import { useState } from "react";
import SignupPage from "./signup"

function LoginPage({ onSwitch }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4" style={{ background: "linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 40%, #e3f0fb 100%)" }}>
      {/* Ambient blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-30 blur-3xl" style={{ background: "#a8d5b5" }} />
      <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: "#90caf9" }} />

      <div className="relative w-full max-w-md">
        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-md" style={{ background: "linear-gradient(135deg, #4caf50, #81c784)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C12 21 4 13.5 4 8.5C4 5.42 6.42 3 9.5 3C11.04 3 12 4 12 4C12 4 12.96 3 14.5 3C17.58 3 20 5.42 20 8.5C20 13.5 12 21 12 21Z" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#1b3a2d", fontFamily: "'Inter', system-ui, sans-serif" }}>Mental Gym</h1>
          <p className="text-sm mt-1" style={{ color: "#5a7a6a" }}>Your mental wellness companion</p>
        </div>

        {/* Card */}
        <div className="bg-white bg-opacity-80 backdrop-blur-sm rounded-3xl shadow-xl px-8 py-9 border border-white border-opacity-60">
          {submitted ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "#1b3a2d" }}>Welcome back</h2>
              <p className="text-sm" style={{ color: "#5a7a6a" }}>You're signed in. Take a breath — you've got this.</p>
              <button onClick={() => setSubmitted(false)} className="mt-6 text-sm underline" style={{ color: "#4caf50" }}>Back to login</button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-1" style={{ color: "#1b3a2d" }}>Sign in</h2>
              <p className="text-sm mb-7" style={{ color: "#7a9a8a" }}>Good to see you again</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: "#5a7a6a" }}>Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handle}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border"
                    style={{ background: "#f4faf6", borderColor: form.email ? "#81c784" : "#dce8e0", color: "#1b3a2d" }}
                    onFocus={e => e.target.style.borderColor = "#4caf50"}
                    onBlur={e => e.target.style.borderColor = form.email ? "#81c784" : "#dce8e0"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: "#5a7a6a" }}>Password</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handle}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all border"
                    style={{ background: "#f4faf6", borderColor: form.password ? "#81c784" : "#dce8e0", color: "#1b3a2d" }}
                    onFocus={e => e.target.style.borderColor = "#4caf50"}
                    onBlur={e => e.target.style.borderColor = form.password ? "#81c784" : "#dce8e0"}
                  />
                  <div className="text-right mt-1.5">
                    <span className="text-xs cursor-pointer" style={{ color: "#4caf50" }}>Forgot password?</span>
                  </div>
                </div>

                <button
                  onClick={submit}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 mt-2 shadow-md"
                  style={{ background: "linear-gradient(135deg, #4caf50, #66bb6a)", letterSpacing: "0.02em" }}
                  onMouseEnter={e => e.target.style.opacity = "0.92"}
                  onMouseLeave={e => e.target.style.opacity = "1"}
                >
                  Sign in
                </button>
              </div>

              <p className="text-center text-sm mt-7" style={{ color: "#7a9a8a" }}>
                New here?{" "}
                <span onClick={onSwitch} className="font-medium cursor-pointer" style={{ color: "#4caf50" }}>
                  Create an account
                </span>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#9ab5a7" }}>
          Your privacy is protected. We never share your data.
        </p>
      </div>
    </div>
  );
}



export default function App() {
  const [page, setPage] = useState("login");

  return page === "login"
    ? <LoginPage onSwitch={() => setPage("signup")} />
    : <SignupPage onSwitch={() => setPage("login")} />;
}
