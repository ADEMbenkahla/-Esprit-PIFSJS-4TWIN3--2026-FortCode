/**
 * Centralized utility for managing Frontend and Backend URLs.
 * Dynamically switches between Localhost and Ngrok based on availability.
 */

const getFrontendUrl = () => {
    // Priority: RENDER_EXTERNAL_URL (if on frontend service) > FRONTEND_NGROK_URL > FRONTEND_URL
    let url = process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_NGROK_URL || process.env.FRONTEND_URL || 'https://fortcode-frontend.onrender.com';
    return url.replace(/\/+$/, ''); // Remove trailing slash
};

const getBackendUrl = () => {
    // Priority: RENDER_EXTERNAL_URL (automatic on Render) > NGROK_URL > BACKEND_URL
    let url = process.env.RENDER_EXTERNAL_URL || process.env.NGROK_URL || process.env.BACKEND_URL || 'https://fortcode-backend.onrender.com';
    return url.replace(/\/+$/, ''); // Remove trailing slash
};

module.exports = {
    getFrontendUrl,
    getBackendUrl
};
