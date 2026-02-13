import React, { useState } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";

function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      alert(data.message);
      if (data.success) {
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      alert("Error connecting to server");
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <div className="logo-card login">
        <img src={logoImg} alt="FortCode Logo" />
      </div>

      <label>Email Address</label>
      <input
        type="email"
        placeholder="user@fortcode.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>Password</label>
      <div className="password-container">
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="forgot">Forgot password?</span>
      </div>

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "LOGGING IN..." : "INITIALIZE SESSION →"}
      </button>

      <div className="divider">OR CONTINUE WITH</div>

      <button className="google">Google</button>

      <p className="register">
        New to the Arena? <span onClick={onSwitchToRegister}>Create an account</span>
      </p>
    </div>
  );
}

export default Login;
