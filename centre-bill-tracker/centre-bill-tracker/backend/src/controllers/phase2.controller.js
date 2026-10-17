const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const CATEGORIES = ['Base Amount', 'Internet', 'Static IP', 'Late Fee', 'GST'];
const PAYMENT_METHODS = ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Other'];
const RECONCILIATION = ['Pending', 'Matched', 'Mismatch'];

async function requireBill(id) {
  const [rows] = await pool.execute('SELECT id, amount FROM bills WHERE id = ?', [id]);
  if (!rows.length) throw ApiError.notFound('Bill not found.');
  return rows[0];
}

async function paymentSummary(billId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(amount_paid), 0) AS amount_paid,
            COALESCE(SUM(tds_amount), 0) AS tds_amount,
            COALESCE(SUM(amount_paid + tds_amount), 0) AS settled_amount
       FROM bill_payments WHERE bill_id = ?`,
    [billId],
  );
  return {
    amountPaid: Number(rows[0].amount_paid),
    tdsAmount: Number(rows[0].tds_amount),
    settledAmount: Number(rows[0].settled_amount),
  };
}

const getBreakdown = asyncHandler(async (req, res) => {
  const bill = await requireBill(req.params.id);
  const [items] = await pool.execute(
    'SELECT id, category, amount FROM bill_items WHERE bill_id = ? ORDER BY FIELD(category, ?, ?, ?, ?, ?)',
    [req.params.id, ...CATEGORIES],
  );
  return new ApiResponse(200, {
    billId: Number(bill.id),
    billAmount: Number(bill.amount),
    items: items.map((item) => ({ id: item.id, category: item.category, amount: Number(item.amount) })),
  }).send(res);
});

const saveBreakdown = asyncHandler(async (req, res) => {
  const billId = Number(req.params.id);
  const bill = await requireBill(billId);
  const items = req.body.items;
  if (!Array.isArray(items) || items.length !== CATEGORIES.length) {
    throw ApiError.badRequest('Provide exactly one amount for each bill category.');
  }
  const seen = new Set();
  let total = 0;
  const normalized = items.map((item) => {
    if (!CATEGORIES.includes(item.category) || seen.has(item.category)) {
      throw ApiError.badRequest('Bill categories must be unique and valid.');
    }
    seen.add(item.category);
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) !== amount * 100) {
      throw ApiError.badRequest('Each category amount must be a non-negative amount with up to two decimals.');
    }
    total += amount;
    return { category: item.category, amount: amount.toFixed(2) };
  });
  if (Math.abs(total - Number(bill.amount)) > 0.01) {
    throw ApiError.badRequest(`Category total (${total.toFixed(2)}) must equal bill total (${Number(bill.amount).toFixed(2)}).`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of normalized) {
      await connection.execute(
        `INSERT INTO bill_items (bill_id, category, amount) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
        [billId, item.category, item.amount],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getBreakdown(req, res);
});

const listPayments = asyncHandler(async (req, res) => {
  await requireBill(req.params.id);
  const [payments] = await pool.execute(
    `SELECT p.id, p.payment_date, p.amount_paid, p.tds_amount, p.payment_method,
            p.transaction_reference, p.reconciliation_status, p.remarks,
            p.created_at, u.full_name AS created_by_name
       FROM bill_payments p JOIN users u ON u.id = p.created_by
      WHERE p.bill_id = ? ORDER BY p.payment_date DESC, p.id DESC`,
    [req.params.id],
  );
  const summary = await paymentSummary(req.params.id);
  const bill = await requireBill(req.params.id);
  return new ApiResponse(200, {
    payments: payments.map((p) => ({
      id: p.id,
      paymentDate: p.payment_date,
      amountPaid: Number(p.amount_paid),
      tdsAmount: Number(p.tds_amount),
      paymentMethod: p.payment_method,
      transactionReference: p.transaction_reference,
      reconciliationStatus: p.reconciliation_status,
      remarks: p.remarks,
      createdAt: p.created_at,
      createdByName: p.created_by_name,
    })),
    summary: {
      ...summary,
      billAmount: Number(bill.amount),
      outstandingBalance: Math.max(0, Number(bill.amount) - summary.settledAmount),
    },
  }).send(res);
});

const createPayment = asyncHandler(async (req, res) => {
  const billId = Number(req.params.id);
  const bill = await requireBill(billId);
  const {
    paymentDate, amountPaid, tdsAmount = 0, paymentMethod = 'Bank Transfer',
    transactionReference = '', reconciliationStatus = 'Pending', remarks = '',
  } = req.body;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(paymentDate || '')) || Number.isNaN(Date.parse(paymentDate)) || new Date(paymentDate).toISOString().slice(0, 10) !== paymentDate) {
    throw ApiError.badRequest('A valid payment date in YYYY-MM-DD format is required.');
  }
  const paid = Number(amountPaid);
  const tds = Number(tdsAmount);
  if (!Number.isFinite(paid) || paid <= 0 || Math.round(paid * 100) !== paid * 100) {
    throw ApiError.badRequest('Payment amount must be positive and have up to two decimals.');
  }
  if (!Number.isFinite(tds) || tds < 0 || Math.round(tds * 100) !== tds * 100) {
    throw ApiError.badRequest('TDS amount must be non-negative and have up to two decimals.');
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw ApiError.badRequest('Invalid payment method.');
  if (!RECONCILIATION.includes(reconciliationStatus)) throw ApiError.badRequest('Invalid reconciliation status.');
  if (String(transactionReference).length > 120 || String(remarks).length > 1000) {
    throw ApiError.badRequest('Transaction reference or remarks is too long.');
  }

  const connection = await pool.getConnection();
  let paymentId;
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.execute(
      'SELECT id, amount, bill_status FROM bills WHERE id = ? FOR UPDATE', [billId],
    );
    if (!existingRows.length) throw ApiError.notFound('Bill not found.');
    if (existingRows[0].bill_status === 'Paid') {
      throw ApiError.badRequest('This bill is already marked Paid.');
    }
    if (existingRows[0].bill_status !== 'Received') {
      throw ApiError.badRequest('Mark the bill as Received before recording a payment.');
    }
    const [totals] = await connection.execute(
      'SELECT COALESCE(SUM(amount_paid + tds_amount), 0) AS settled FROM bill_payments WHERE bill_id = ?',
      [billId],
    );
    const settled = Number(totals[0].settled);
    if (settled + paid + tds > Number(existingRows[0].amount) + 0.01) {
      throw ApiError.badRequest('Payment plus TDS cannot exceed the bill outstanding balance.');
    }
    const [result] = await connection.execute(
      `INSERT INTO bill_payments
       (bill_id, payment_date, amount_paid, tds_amount, payment_method, transaction_reference,
        reconciliation_status, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [billId, paymentDate, paid.toFixed(2), tds.toFixed(2), paymentMethod,
        String(transactionReference).trim() || null, reconciliationStatus, String(remarks).trim() || null, req.user.id],
    );
    paymentId = result.insertId;
    const newSettled = settled + paid + tds;
    if (newSettled >= Number(existingRows[0].amount) - 0.01) {
      if (req.user.role !== 'Admin') {
        throw ApiError.forbidden('Only an Admin can record the final payment that marks a bill Paid.');
      }
      await connection.execute(
        `UPDATE bills SET bill_status = 'Paid', payment_date = ? WHERE id = ? AND bill_status <> 'Paid'`,
        [paymentDate, billId],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [rows] = await pool.execute(
    `SELECT p.id, p.payment_date, p.amount_paid, p.tds_amount, p.payment_method,
            p.transaction_reference, p.reconciliation_status, p.remarks, p.created_at,
            u.full_name AS created_by_name
       FROM bill_payments p JOIN users u ON u.id = p.created_by WHERE p.id = ?`,
    [paymentId],
  );
  const p = rows[0];
  return new ApiResponse(201, {
    payment: {
      id: p.id, paymentDate: p.payment_date, amountPaid: Number(p.amount_paid),
      tdsAmount: Number(p.tds_amount), paymentMethod: p.payment_method,
      transactionReference: p.transaction_reference, reconciliationStatus: p.reconciliation_status,
      remarks: p.remarks, createdAt: p.created_at, createdByName: p.created_by_name,
    },
  }, 'Payment recorded successfully').send(res);
});

const listAttachments = asyncHandler(async (req, res) => {
  await requireBill(req.params.id);
  const [rows] = await pool.execute(
    'SELECT id, original_filename, mime_type, file_size, uploaded_by, created_at FROM bill_attachments WHERE bill_id = ? ORDER BY id DESC',
    [req.params.id],
  );
  return new ApiResponse(200, { attachments: rows.map((a) => ({
    id: a.id, filename: a.original_filename, mimeType: a.mime_type,
    fileSize: a.file_size, uploadedBy: a.uploaded_by, createdAt: a.created_at,
  })) }).send(res);
});

const uploadAttachment = asyncHandler(async (req, res) => {
  await requireBill(req.params.id);
  if (!req.file) throw ApiError.badRequest('Choose a PDF or image file to upload.');
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(req.file.mimetype)) throw ApiError.badRequest('Only PDF, JPG, PNG, or WEBP invoices are supported.');
  const bytes = req.file.buffer;
  const signatureValid = req.file.mimetype === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
    : req.file.mimetype === 'image/jpeg' ? bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : req.file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!signatureValid) throw ApiError.badRequest('The uploaded file content does not match its file type.');
  const [result] = await pool.execute(
    `INSERT INTO bill_attachments
     (bill_id, original_filename, mime_type, file_size, file_data, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.params.id, req.file.originalname.slice(0, 255), req.file.mimetype,
      req.file.size, req.file.buffer, req.user.id],
  );
  return new ApiResponse(201, { attachment: {
    id: result.insertId, filename: req.file.originalname.slice(0, 255),
    mimeType: req.file.mimetype, fileSize: req.file.size,
  } }, 'Invoice uploaded successfully').send(res);
});

const downloadAttachment = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT original_filename, mime_type, file_size, file_data FROM bill_attachments WHERE id = ? AND bill_id = ?',
    [req.params.attachmentId, req.params.id],
  );
  if (!rows.length) throw ApiError.notFound('Invoice attachment not found.');
  const file = rows[0];
  const safeName = file.original_filename.replace(/[\r\n"\\]/g, '_');
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Length', file.file_size);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(file.file_data);
});

module.exports = { getBreakdown, saveBreakdown, listPayments, createPayment, listAttachments, uploadAttachment, downloadAttachment };
