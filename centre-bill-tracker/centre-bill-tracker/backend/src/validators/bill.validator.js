const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive('Invalid bill id'),
});

const yearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const billBodySchema = z.object({
  centreId: z.coerce.number({ required_error: 'Centre is required' }).int().positive('Centre is required'),
  billMonth: z
    .string({ required_error: 'Bill month is required' })
    .regex(yearMonthRegex, 'Bill month must be a valid month (YYYY-MM)'),
  invoiceNumber: z
    .string({ required_error: 'Invoice number is required' })
    .trim()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number must be at most 100 characters'),
  invoiceDate: z
    .string({ required_error: 'Invoice date is required' })
    .regex(dateRegex, 'Invoice date must be a valid date'),
  dueDate: z
    .string({ required_error: 'Due date is required' })
    .regex(dateRegex, 'Due date must be a valid date'),
  amount: z.coerce
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0')
    .max(99999999.99, 'Amount is too large'),
  remarks: z.string().trim().max(2000, 'Remarks must be at most 2000 characters').optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),
});

const createBillSchema = z.object({
  body: billBodySchema,
});

const updateBillSchema = z.object({
  params: idParam,
  body: billBodySchema,
});

const updateBillStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: z.enum(['Received', 'Paid'], {
      errorMap: () => ({ message: 'Status must be either Received or Paid' }),
    }),
  }),
});

const listBillsSchema = z.object({
  query: z.object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(['Pending', 'Received', 'Paid']).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

module.exports = {
  createBillSchema,
  updateBillSchema,
  updateBillStatusSchema,
  listBillsSchema,
};
