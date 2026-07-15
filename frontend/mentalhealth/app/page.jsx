"use client";
import { useState } from "react";
import LoginPage    from "./pages/login";
import SignupPage   from "./pages/signup";
import ScenarioPage from "./pages/scenario";

export default function App() {
  const [page, setPage]           = useState("login");
  const [userProfile, setProfile] = useState(null);

  const handleSignupDone = (profile) => {
    setProfile(profile);
    setPage("scenario");
  };

  return (
    page === "login"    ? <LoginPage  onSwitch={() => setPage("signup")} /> :
    page === "signup"   ? <SignupPage onSwitch={() => setPage("login")} onDone={handleSignupDone} /> :
    page === "scenario" ? <ScenarioPage userProfile={userProfile} /> :
    null
  );
}