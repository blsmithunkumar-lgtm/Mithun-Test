const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    status: user.status,
  };
}

/**
 * POST /api/auth/login
 * Public. Verifies credentials and issues a JWT.
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await userModel.findByUsername(username);
  // Same generic message whether the username doesn't exist or the
  // password is wrong, to avoid revealing which usernames are valid.
  const invalidCredentialsError = ApiError.unauthorized('Invalid username or password.');

  if (!user) {
    throw invalidCredentialsError;
  }

  if (user.status !== 'Active') {
    throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw invalidCredentialsError;
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );

  return new ApiResponse(200, { token, user: sanitizeUser(user) }, 'Login successful').send(res);
});

/**
 * GET /api/auth/me
 * Protected. Returns the currently authenticated user.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { user: sanitizeUser(req.user) }).send(res);
});

module.exports = { login, getCurrentUser };
