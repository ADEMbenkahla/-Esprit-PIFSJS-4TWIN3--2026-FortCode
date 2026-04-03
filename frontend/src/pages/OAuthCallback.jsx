import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const role = searchParams.get('role');

        if (token) {
            // Same as password login: keep session + local in sync so guards and axios agree on role
            sessionStorage.setItem('token', token);
            localStorage.setItem('token', token);

            let payloadRole = (role || "").toString().toLowerCase().trim();
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                sessionStorage.setItem("userId", payload.id);
                sessionStorage.setItem("userRole", payload.role);
                if (payload.role) {
                    payloadRole = String(payload.role).toLowerCase().trim();
                }
            } catch (e) {
                console.error("Failed to parse token payload in callback");
            }

            // Notify other components of token change
            window.dispatchEvent(new Event('tokenChanged'));

            console.log("🎫 OAuth Token Role (JWT):", payloadRole);

            // Redirect based on role — admin only to back office; participant/recruiter to front office
            if (payloadRole === 'admin') {
                console.log("➡️ Redirection vers /backoffice/dashboard");
                navigate('/backoffice/dashboard');
            } else if (payloadRole === 'participant' || payloadRole === 'recruiter') {
                console.log("➡️ Redirection vers /home");
                navigate('/home');
            } else {
                console.log("➡️ Redirection vers /");
                navigate('/');
            }
        } else {
            // No token, redirect to login
            navigate('/');
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-background-dark">
            <div className="text-white text-xl">Completing login...</div>
        </div>
    );
}

export default OAuthCallback;
