import React, { useState } from "react";
import logoImg from "../assets/logo.png";
import "./pages.css";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
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
            const response = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ newPassword: password }),
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#1a1a2e',
                    color: '#fff'
                }).then(() => {
                    navigate("/");
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

                <label>New Password</label>
                <div className="password-container">
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <label>Confirm Password</label>
                <div className="password-container">
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>

                <button onClick={handleResetPassword} disabled={loading}>
                    {loading ? "RESETTING..." : "RESET PASSWORD →"}
                </button>
            </div>
        </div>
    );
}

export default ResetPassword;
