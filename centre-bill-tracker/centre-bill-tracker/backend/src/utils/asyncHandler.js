/**
 * Wraps an async Express route handler so any thrown/rejected error is
 * forwarded to next(), letting the centralized error middleware handle it.
 * Avoids repeating try/catch in every controller function.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
