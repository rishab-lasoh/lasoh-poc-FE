import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const getUserId = () => {
  const existing = localStorage.getItem("mixpanel_user_id");
  if (existing) return existing;
  const newId = crypto.randomUUID();
  localStorage.setItem("mixpanel_user_id", newId);
  return newId;
};

export default function App() {
  const userId = useMemo(() => getUserId(), []);
  const [eventStep, setEventStep] = useState(1);
  const [screen, setScreen] = useState("start");
  const [signupMethod, setSignupMethod] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [profileName, setProfileName] = useState("");
  const lastIdentifiedRef = useRef("");

  useEffect(() => {
    // No manual tracking needed here!
  }, []);

  const handleSignupStart = async () => {
    if (!identifier) return;

    setEventStep(2);
    
    const userIdentifier = identifier.trim();
    if (window.rudderanalytics && typeof window.rudderanalytics.reset === "function") {
      if (lastIdentifiedRef.current && lastIdentifiedRef.current !== userId) {
        window.rudderanalytics.reset();
      }
    }
    if (window.identifyToRudderStack) {
      window.identifyToRudderStack(userId, {
        email: signupMethod === "email" ? userIdentifier : undefined,
        phone: signupMethod === "phone" ? userIdentifier : undefined,
        signup_method: signupMethod,
      });
      lastIdentifiedRef.current = userId;
    }

    const response = await fetch(`${API_BASE_URL}/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        signup_method: signupMethod,
        platform: "web",
        device: navigator.userAgent,
      }),
    });

    const data = await response.json();
    setServerOtp(data.otp);
    setEventStep(3);
    setScreen("otp");
    
  };

  const handleVerifyOtp = async () => {
    const response = await fetch(`${API_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        otp,
        signup_method: signupMethod,
        platform: "web",
        device: navigator.userAgent,
      }),
    });

    const data = await response.json();
    if (data.success) {
      setEventStep(4);
      setScreen("profile");
      
    } else {
      alert("Invalid OTP. Try again.");
    }
  };

  const handleProfileComplete = () => {
    if (!profileName) return;

    setEventStep(5);
    setScreen("finish");
    
    // Track profile completed
    if (window.identifyToRudderStack) {
      window.identifyToRudderStack(userId, {
        profile_name: profileName,
        signup_method: signupMethod,
        email: signupMethod === "email" ? identifier.trim() : undefined,
        phone: signupMethod === "phone" ? identifier.trim() : undefined,
      });
    }

  };

  const handleSignupComplete = async () => {
    await fetch(`${API_BASE_URL}/signup/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        signup_method: signupMethod,
        platform: "web",
        device: navigator.userAgent,
      }),
    });

    setEventStep(6);
    setScreen("done");
    
  };

  return (
    <div className="container">
      <header>
        <h1>Signup Funnel POC</h1>
        <p>Track each signup step with Mixpanel.</p>
      </header>

      <section className="card">
        <div className="step">Step {eventStep} of 6</div>

        {screen === "start" && (
          <div className="stack" data-track-section="signup_start_form">
            <label>
              Signup method
              <select
                value={signupMethod}
                onChange={(event) => setSignupMethod(event.target.value)}
                data-track-name="signup_method_select"
                data-track-screen="start"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </label>
            <label>
              {signupMethod === "email" ? "Email" : "Phone number"}
              <input
                type={signupMethod === "email" ? "email" : "tel"}
                placeholder={signupMethod === "email" ? "name@company.com" : "+91 99999 99999"}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                data-track-name="signup_identifier_input"
                data-track-screen="start"
              />
            </label>
            <button
              onClick={handleSignupStart}
              data-track-name="signup_start_button"
              data-track-screen="start"
            >
              Start signup
            </button>
          </div>
        )}

        {screen === "otp" && (
          <div className="stack" data-track-section="otp_form">
            <p className="hint">OTP Sent (from backend). For this POC, use: <strong>{serverOtp}</strong></p>
            <label>
              Enter OTP
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                data-track-name="otp_input"
                data-track-screen="otp"
              />
            </label>
            <button
              onClick={handleVerifyOtp}
              data-track-name="verify_otp_button"
              data-track-screen="otp"
            >
              Verify OTP
            </button>
          </div>
        )}

        {screen === "profile" && (
          <div className="stack" data-track-section="profile_form">
            <label>
              Profile name
              <input
                type="text"
                placeholder="Your name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                data-track-name="profile_name_input"
                data-track-screen="profile"
              />
            </label>
            <button
              onClick={handleProfileComplete}
              data-track-name="profile_complete_button"
              data-track-screen="profile"
            >
              Complete profile
            </button>
          </div>
        )}

        {screen === "finish" && (
          <div className="stack" data-track-section="finish_form">
            <p>Ready to finish signup?</p>
            <button
              onClick={handleSignupComplete}
              data-track-name="signup_finish_button"
              data-track-screen="finish"
            >
              Finish signup
            </button>
          </div>
        )}

        {screen === "done" && (
          <div className="stack" data-track-section="done_screen">
            <p className="success">Signup Completed 🎉</p>
            <button
              onClick={() => {
                if (window.rudderanalytics && typeof window.rudderanalytics.reset === "function") {
                  window.rudderanalytics.reset();
                }
                localStorage.removeItem("mixpanel_user_id");
                localStorage.removeItem("rs_anon_id");
                lastIdentifiedRef.current = "";
                setScreen("start");
                setEventStep(1);
                setIdentifier("");
                setOtp("");
                setServerOtp("");
                setProfileName("");
              }}
              data-track-name="signup_restart_button"
              data-track-screen="done"
            >
              Restart flow
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
