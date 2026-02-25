import React, { useState, useEffect } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

import Swal from "sweetalert2";

function Login({ onSwitchToRegister }) {
  const { connect } = useSocket();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("error") === "deactivated") {
      Swal.fire({
        icon: 'error',
        title: 'Account Deactivated',
        text: 'Your account has been deactivated. Please contact support.',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#d33'
      });
      // Nettoyer l'URL
      navigate("/", { replace: true });
    }
  }, [location, navigate]);

  const handleLogin = async () => {
    if (!identifier || !password) {
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
    console.log("DEBUG: Sending Login Request:", { identifier, password });

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn("DEBUG: Login Failed. Server responded:", data);
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

      if (data.twoFactorRequired) {
        setTwoFactorRequired(true);
        setTwoFactorMethod(data.method || "totp");
        setTwoFactorToken(data.twoFactorToken || "");
        setTwoFactorCode("");

        Swal.fire({
          icon: 'info',
          title: '2FA Required',
          text: data.method === 'email' ? 'Check your email for the code.' : 'Enter the code from your authenticator app.',
          background: '#1a1a2e',
          color: '#fff'
        });

        setLoading(false);
        return;
      }

      // ✅ Stocker token
      localStorage.setItem("token", data.token);
      connect(data.token);

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
          navigate("/backoffice/dashboard");
        } else if (payload.role === "participant") {
          navigate("/home");
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

  const handleVerify2fa = async () => {
    if (!twoFactorCode) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Code',
        text: 'Please enter the 2FA code',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ twoFactorToken, code: twoFactorCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        Swal.fire({
          icon: 'error',
          title: '2FA Failed',
          text: data.message,
          background: '#1a1a2e',
          color: '#fff',
          confirmButtonColor: '#d33'
        });
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      connect(data.token);

      Swal.fire({
        icon: 'success',
        title: 'Welcome Back!',
        text: 'Login successful',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1a2e',
        color: '#fff'
      });

      const payload = JSON.parse(atob(data.token.split(".")[1]));

      setTimeout(() => {
        if (payload.role === "admin") {
          navigate("/backoffice/dashboard");
        } else if (payload.role === "participant") {
          navigate("/home");
        } else {
          navigate("/");
        }
      }, 1500);

      setTwoFactorRequired(false);
      setTwoFactorMethod("");
      setTwoFactorToken("");
      setTwoFactorCode("");
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

        {!twoFactorRequired && (
          <>
            <label>Username or Email Address</label>
            <input
              type="text"
              placeholder="user@fortcode.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <label>Password</label>
            <div className="password-container">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Link to="/forgot-password" title="Forgot password?" className="forgot">
                Forgot password?
              </Link>
              <div style={{ clear: 'both' }}></div>
            </div>

            <button onClick={handleLogin} disabled={loading}>
              {loading ? "SIGNING IN..." : "SIGN IN →"}
            </button>
          </>
        )}

        {twoFactorRequired && (
          <>
            <label>2FA Code</label>
            <input
              type="text"
              placeholder={twoFactorMethod === 'email' ? 'Enter code from email' : 'Enter code from app'}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
            />

            <button onClick={handleVerify2fa} disabled={loading}>
              {loading ? "VERIFYING..." : "VERIFY CODE →"}
            </button>

            <button
              onClick={() => {
                setTwoFactorRequired(false);
                setTwoFactorMethod("");
                setTwoFactorToken("");
                setTwoFactorCode("");
              }}
              className="google"
              type="button"
            >
              Back to Login
            </button>
          </>
        )}

        {!twoFactorRequired && (
          <>
            <div className="divider">OR CONTINUE WITH</div>

            <button
              onClick={() => window.location.href = 'http://127.0.0.1:5000/api/auth/google'}
              className="google">
              Google
            </button>
          </>
        )}

        {!twoFactorRequired && (
          <p className="register">
            New to the Arena? <span onClick={() => navigate('/register')}>Create an account</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
