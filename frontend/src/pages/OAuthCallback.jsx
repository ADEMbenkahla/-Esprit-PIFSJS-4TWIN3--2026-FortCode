import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const role = searchParams.get('role');

        if (token) {
            // Store token in sessionStorage (isolated per tab)
            sessionStorage.setItem('token', token);

            // Extract and store payload
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                sessionStorage.setItem("userId", payload.id);
                sessionStorage.setItem("userRole", payload.role);
            } catch (e) {
                console.error("Failed to parse token payload in callback");
            }

            // Notify other components of token change
            window.dispatchEvent(new Event('tokenChanged'));

            console.log("🎫 OAuth Token Role:", role);

            // Redirect based on role — admin only to back office; participant/recruiter to front office
            if (role === 'admin') {
                console.log("➡️ Redirection vers /backoffice/dashboard");
                navigate('/backoffice/dashboard');
            } else if (role === 'participant' || role === 'recruiter') {
<<<<<<< HEAD
=======
                console.log("➡️ Redirection vers /home");
>>>>>>> da4a379f517619ed5f2890a9aff73fb6d70d1968
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
