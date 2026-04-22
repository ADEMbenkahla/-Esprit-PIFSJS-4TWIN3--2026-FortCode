/**
 * AI Exercise Service
 * Handles error mapping and general utilities for AI exercise generation.
 */

/**
 * Maps AI-related error codes to HTTP status codes.
 * @param {Error} err The error object.
 * @returns {number} HTTP status code.
 */
function httpStatusForAiError(err) {
    if (!err || !err.code) return 500;

    switch (err.code) {
        case 'AI_INVALID_JSON':
        case 'AI_MISSING_FIELDS':
            return 400;
        case 'AI_RATE_LIMIT':
            return 429;
        case 'AI_SERVICE_UNAVAILABLE':
            return 503;
        case 'AI_QUOTA_EXCEEDED':
            return 402;
        default:
            return 500;
    }
}

module.exports = {
    httpStatusForAiError
};
