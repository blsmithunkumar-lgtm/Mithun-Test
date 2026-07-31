const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    username: z.string({ required_error: 'Username is required' }).trim().min(1, 'Username is required'),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }),
});

module.exports = { loginSchema };
