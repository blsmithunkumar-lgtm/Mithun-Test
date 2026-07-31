const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive('Invalid centre id'),
});

// Empty string is treated the same as "not provided" for optional text fields.
const optionalTrimmed = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val));

const centreBodySchema = z.object({
  centreName: z
    .string({ required_error: 'Centre name is required' })
    .trim()
    .min(1, 'Centre name is required')
    .max(200, 'Centre name must be at most 200 characters'),
  vendorName: optionalTrimmed(200, 'Vendor name'),
  wifiId: optionalTrimmed(150, 'WiFi ID'),
  accountNumber: optionalTrimmed(150, 'Account number'),
});

const createCentreSchema = z.object({
  body: centreBodySchema,
});

const updateCentreSchema = z.object({
  params: idParam,
  body: centreBodySchema,
});

const updateStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: z.enum(['Active', 'Inactive'], {
      errorMap: () => ({ message: 'Status must be either Active or Inactive' }),
    }),
  }),
});

const deleteCentreSchema = z.object({
  params: idParam,
});

const listCentresSchema = z.object({
  query: z.object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
});

module.exports = {
  createCentreSchema,
  updateCentreSchema,
  updateStatusSchema,
  deleteCentreSchema,
  listCentresSchema,
};
