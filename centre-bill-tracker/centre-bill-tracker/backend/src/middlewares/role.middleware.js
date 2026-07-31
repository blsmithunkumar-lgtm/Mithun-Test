const ApiError = require('../utils/ApiError');

/**
 * Restricts a route to one or more roles. Must run after `authenticate`,
 * which populates req.user.
 *
 * Usage: router.post('/centres', authenticate, requireRole('Admin'), ...)
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required.'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action.'));
  }
  return next();
};

module.exports = requireRole;
