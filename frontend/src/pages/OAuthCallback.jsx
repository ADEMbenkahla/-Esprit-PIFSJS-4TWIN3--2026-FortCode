import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const role = searchParams.get('role');

        if (token) {
            // Store token
            localStorage.setItem('token', token);

            // Redirect based on role — admin only to back office; participant/recruiter to front office
            if (role === 'admin') {
                navigate('/backoffice/dashboard');
            } else if (role === 'participant' || role === 'recruiter') {
                navigate('/home');
            } else {
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
