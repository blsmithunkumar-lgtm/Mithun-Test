const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

/**
 * Validates req.body / req.params / req.query against a zod schema shaped as
 * z.object({ body: ..., params: ..., query: ... }). On success, replaces
 * each validated section with the parsed (and coerced/trimmed) value so
 * downstream code can trust the shape of the data.
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.params) req.params = parsed.params;
    if (parsed.query) req.query = parsed.query;
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => ({
        field: e.path.slice(1).join('.') || e.path.join('.'),
        message: e.message,
      }));
      return next(ApiError.badRequest('Validation failed', errors));
    }
    return next(err);
  }
};

module.exports = validate;
