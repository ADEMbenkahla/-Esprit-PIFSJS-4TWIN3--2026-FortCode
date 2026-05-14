/**
 * Centralized utility for managing Frontend and Backend URLs.
 * Dynamically switches between Localhost and Ngrok based on availability.
 */

const getFrontendUrl = () => {
    // Priority: FRONTEND_NGROK_URL > FRONTEND_URL > Production Render > default localhost
    return process.env.FRONTEND_NGROK_URL || process.env.FRONTEND_URL || 'https://fortcode-frontend.onrender.com';
};

const getBackendUrl = () => {
    // Priority: NGROK_URL > Production Render > default localhost
    return process.env.NGROK_URL || process.env.BACKEND_URL || 'https://fortcode-backend.onrender.com';
};

module.exports = {
    getFrontendUrl,
    getBackendUrl
};
