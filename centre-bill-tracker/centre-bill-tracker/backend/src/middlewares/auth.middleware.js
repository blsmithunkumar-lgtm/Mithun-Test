const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const userModel = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verifies the Bearer JWT on the request, loads the current user from the
 * database (so a deactivated or deleted account is rejected even with a
 * still-valid token), and attaches it to req.user for downstream handlers.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Authentication token missing. Please log in.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await userModel.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists.');
  }
  if (user.status !== 'Active') {
    throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');
  }

  req.user = user; // { id, username, full_name, role, status }
  next();
});

module.exports = authenticate;
