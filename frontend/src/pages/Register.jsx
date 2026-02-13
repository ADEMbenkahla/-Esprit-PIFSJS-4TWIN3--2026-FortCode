import React, { useState } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";

function Register({ onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      alert(data.message);
      if (data.message.includes("successfully")) {
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        onSwitchToLogin();
      }
    } catch (error) {
      alert("Error connecting to server");
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="logo-card register">
        <img src={logoImg} alt="FortCode Logo" />
      </div>

      <label>Username</label>
      <input
        type="text"
        placeholder="Your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <label>Email Address</label>
      <input
        type="email"
        placeholder="you@fortcode.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Password</label>
      <input
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <label>Confirm Password</label>
      <input
        type="password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <button onClick={handleRegister} disabled={loading}>
        {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT →"}
      </button>

      <div className="divider">OR CONTINUE WITH</div>

      <button className="google">Google</button>

      <p className="register">
        Already have an account? <span onClick={onSwitchToLogin}>Sign in</span>
      </p>
    </div>
  );
}

export default Register;
