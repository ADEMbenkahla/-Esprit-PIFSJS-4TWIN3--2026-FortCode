import React, { useState } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";
import { useNavigate } from "react-router-dom";

import Swal from "sweetalert2";

function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in all fields',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#7c3aed'
      });
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

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: data.message,
          background: '#1a1a2e',
          color: '#fff',
          confirmButtonColor: '#d33'
        });
        setLoading(false);
        return;
      }

      // ✅ Stocker token
      localStorage.setItem("token", data.token);

      Swal.fire({
        icon: 'success',
        title: 'Welcome Back!',
        text: 'Login successful',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1a2e',
        color: '#fff'
      });

      // ✅ Décoder le rôle (si envoyé)
      const payload = JSON.parse(atob(data.token.split(".")[1]));

      setTimeout(() => {
        if (payload.role === "admin") {
          navigate("/backoffice/users");
        } else {
          navigate("/");
        }
      }, 1500);

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Server error. Please try again later.',
        background: '#1a1a2e',
        color: '#fff'
      });
    }

    setLoading(false);
  };


  return (
    <div className="auth-container">
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

        <button
          onClick={() => window.location.href = 'http://127.0.0.1:5000/api/auth/google'}
          className="google">
          Google
        </button>

        <p className="register">
          New to the Arena? <span onClick={() => navigate('/register')}>Create an account</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
