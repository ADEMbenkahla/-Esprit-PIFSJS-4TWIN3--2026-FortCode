/**
 * Maps AI-specific error codes to HTTP status codes.
 * @param {Error} error
 * @returns {number} HTTP status code
 */
exports.httpStatusForAiError = (error) => {
  const code = error?.code || "";
  
  switch (code) {
    case "AI_SERVICE_UNAVAILABLE":
      return 503;
    case "AI_QUOTA_EXCEEDED":
      return 429;
    case "AI_INVALID_RESPONSE":
      return 502;
    case "AI_BAD_REQUEST":
      return 400;
    default:
      return 500;
  }
};
