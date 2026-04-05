import React, { useState, useEffect } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import Swal from "sweetalert2";

function VerifyEmail() {
    const { connect } = useSocket();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No email found for verification.',
                background: '#1a1a2e',
                color: '#fff'
            }).then(() => {
                navigate('/');
            });
        }
    }, [searchParams, navigate]);

    const handleVerify = async () => {
        if (!code) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Code',
                text: 'Please enter the verification code sent to your email',
                background: '#1a1a2e',
                color: '#fff',
                confirmButtonColor: '#7c3aed'
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("http://localhost:5000/api/auth/verify-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, code }),
            });

            const data = await response.json();

            if (response.ok) {
                if (data.token) {
                    sessionStorage.setItem("token", data.token);

                    const payload = JSON.parse(atob(data.token.split(".")[1]));
                    sessionStorage.setItem("userId", payload.id);
                    sessionStorage.setItem("userRole", payload.role);

                    window.dispatchEvent(new Event('tokenChanged'));
                    if (connect) connect(data.token);

                    Swal.fire({
                        icon: 'success',
                        title: 'Verified!',
                        text: 'Your email has been verified successfully. Welcome!',
                        timer: 2000,
                        showConfirmButton: false,
                        background: '#1a1a2e',
                        color: '#fff'
                    }).then(() => {
                        if (payload.role === "admin") navigate("/backoffice/dashboard");
                        else navigate("/home");
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'Verified!',
                        text: 'Your email has been verified. Please log in.',
                        background: '#1a1a2e',
                        color: '#fff',
                        confirmButtonColor: '#7c3aed'
                    }).then(() => {
                        navigate("/");
                    });
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
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
                text: 'Server error. Please try again later.',
                background: '#1a1a2e',
                color: '#fff'
            });
        }
        setLoading(false);
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const response = await fetch("http://localhost:5000/api/auth/resend-verification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Code Sent',
                    text: 'A new verification code has been sent to your email.',
                    background: '#1a1a2e',
                    color: '#fff',
                    confirmButtonColor: '#7c3aed'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Resend',
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
                text: 'Server error. Please try again later.',
                background: '#1a1a2e',
                color: '#fff'
            });
        }
        setResending(false);
    };

    return (
        <div className="auth-container">
            <div className="card">
                <div className="logo-card">
                    <img src={logoImg} alt="FortCode Logo" />
                </div>

                <h2 style={{ textAlign: "center", marginBottom: "1rem", color: "#fff" }}>Verify Your Email</h2>
                <p style={{ textAlign: "center", marginBottom: "2rem", color: "#9ca3af" }}>
                    We sent a verification code to <br /><strong style={{ color: "#fff" }}>{email}</strong>
                </p>

                <label>Verification Code</label>
                <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    style={{ letterSpacing: "4px", textAlign: "center", fontWeight: "bold", fontSize: "1.2rem" }}
                />

                <button onClick={handleVerify} disabled={loading || !code}>
                    {loading ? "VERIFYING..." : "VERIFY CODE →"}
                </button>

                <p className="register" style={{ marginTop: "1rem" }}>
                    Didn't receive the code?{" "}
                    <span onClick={resending ? null : handleResend} style={{ opacity: resending ? 0.5 : 1, cursor: resending ? "default" : "pointer" }}>
                        {resending ? "Sending..." : "Resend Code"}
                    </span>
                </p>

                <p className="register" style={{ marginTop: "0.5rem" }}>
                    <span onClick={() => navigate('/')}>Back to Login</span>
                </p>
            </div>
        </div>
    );
}

export default VerifyEmail;
