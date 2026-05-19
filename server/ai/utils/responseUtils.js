/**
 * AI Service — Response Utilities
 * Helpers that every controller uses to produce uniform JSON API responses.
 */

/**
 * Wrap a successful AI result in a standard envelope.
 * @param {object} data - The AI-generated payload
 * @param {string} [message] - Optional human-readable status message
 */
export const successResponse = (data, message = 'AI processing completed successfully.') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

/**
 * Wrap an AI error in a standard envelope.
 * @param {string} error - Short error identifier
 * @param {string} [details] - Extended description (not exposed in production)
 */
export const errorResponse = (error, details = '') => ({
  success: false,
  error,
  details: process.env.NODE_ENV !== 'production' ? details : undefined,
  timestamp: new Date().toISOString(),
});

/**
 * Parse the raw Gemini text response into a JavaScript object.
 * Strips markdown code fences if Gemini includes them.
 * @param {string} rawText
 * @returns {object}
 */
export const parseJsonResponse = (rawText) => {
  const startIdx = rawText.indexOf('{');
  const endIdx = rawText.lastIndexOf('}');
  
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('No valid JSON block found in raw text.');
  }

  const cleaned = rawText.slice(startIdx, endIdx + 1).trim();
  return JSON.parse(cleaned);
};

/**
 * Generate a short unique session/trace ID for logging.
 */
export const generateTraceId = () =>
  `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
