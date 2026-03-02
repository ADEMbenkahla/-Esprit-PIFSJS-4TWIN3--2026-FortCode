import React, { useState, useEffect } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";
import { useNavigate, useSearchParams } from "react-router-dom";

import Swal from "sweetalert2";

function Register() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [googleData, setGoogleData] = useState({ googleId: "", avatar: "" });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if coming from Google OAuth
    const isGoogle = searchParams.get('google') === 'true';
    if (isGoogle) {
      setIsGoogleUser(true);
      setEmail(searchParams.get('email') || "");
      setUsername(searchParams.get('name')?.replace(/\s+/g, '_') || "");
      setGoogleData({
        googleId: searchParams.get('googleId') || "",
        avatar: searchParams.get('avatar') || ""
      });
    }
  }, [searchParams]);

  const handleRegister = async () => {
    // Validation
    if (!username || !email) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Username and Email are required',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#7c3aed'
      });
      return;
    }

    if (!password || !confirmPassword) {
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

    if (password !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match',
        background: '#1a1a2e',
        color: '#fff',
        confirmButtonColor: '#d33'
      });
      return;
    }

    setLoading(true);
    try {
      const body = {
        username,
        email,
        password,
        ...(isGoogleUser && { googleId: googleData.googleId, avatar: googleData.avatar })
      };

      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.message.includes("successfully")) {
        Swal.fire({
          icon: 'success',
          title: 'Registration Successful',
          text: data.message,
          background: '#1a1a2e',
          color: '#fff',
          confirmButtonColor: '#7c3aed'
        }).then(() => {
          if (data.requiresVerification) {
            navigate(`/verify-email?email=${encodeURIComponent(data.email || email)}`);
          } else {
            navigate("/");
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: data.message,
          background: '#1a1a2e',
          color: '#fff',
          confirmButtonColor: '#d33'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error connecting to server',
        background: '#1a1a2e',
        color: '#fff'
      });
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
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
          disabled={isGoogleUser}
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

        <button
          onClick={() => window.location.href = 'http://127.0.0.1:5000/api/auth/google'}
          className="google">
          Google
        </button>

        <p className="register">
          Already have an account? <span onClick={() => navigate('/')}>Sign in</span>
        </p>
      </div>
    </div>
  );
}

export default Register;
