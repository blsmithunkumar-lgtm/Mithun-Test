const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * MySQL error codes we translate into friendly, predictable API errors
 * instead of leaking raw driver messages to the client.
 */
function mapKnownDbErrors(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    return ApiError.conflict('A record with the same unique value already exists.');
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return ApiError.conflict('This record cannot be deleted because it is referenced by other records.');
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return ApiError.badRequest('The related record referenced does not exist.');
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return ApiError.badRequest('One of the provided values violates a data rule (e.g. amount must be greater than 0).');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    const mapped = mapKnownDbErrors(err);
    error = mapped || new ApiError(err.statusCode || 500, err.message || 'Internal server error');
  }

  if (env.nodeEnv === 'development' && error.statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors && error.errors.length > 0 ? error.errors : undefined,
    ...(env.nodeEnv === 'development' && error.statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = errorMiddleware;
