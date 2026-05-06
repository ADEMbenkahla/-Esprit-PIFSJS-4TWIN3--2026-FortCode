/**
 * Centralized utility for managing Frontend and Backend URLs.
 * Dynamically switches between Localhost and Ngrok based on availability.
 */

const getFrontendUrl = () => {
    // Priority: FRONTEND_NGROK_URL > FRONTEND_URL > default localhost
    return process.env.FRONTEND_NGROK_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
};

const getBackendUrl = () => {
    // Priority: NGROK_URL > default localhost
    return process.env.NGROK_URL || `http://localhost:${process.env.PORT || 5000}`;
};

module.exports = {
    getFrontendUrl,
    getBackendUrl
};
