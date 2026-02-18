import React, { useState } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleForgotPassword = async () => {
        if (!email) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Email',
                text: 'Please enter your email address',
                background: '#1a1a2e',
                color: '#fff',
                confirmButtonColor: '#7c3aed'
            });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid email address (e.g., user@example.com)',
                background: '#1a1a2e',
                color: '#fff',
                confirmButtonColor: '#d33'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Email Sent',
                    text: data.message,
                    background: '#1a1a2e',
                    color: '#fff',
                    confirmButtonColor: '#7c3aed'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                    background: '#1a1a2e',
                    color: '#fff',
                    confirmButtonColor: '#d33'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
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
                <div className="logo-card">
                    <img src={logoImg} alt="FortCode Logo" />
                </div>

                <label>Email Address</label>
                <input
                    type="email"
                    placeholder="user@fortcode.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <button onClick={handleForgotPassword} disabled={loading}>
                    {loading ? "SENDING..." : "SEND RESET LINK →"}
                </button>

                <div className="divider">OR</div>

                <p className="register">
                    <span onClick={() => navigate('/')}>Back to Login</span>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;
