const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const CATEGORIES = ['Base Amount', 'Internet', 'Static IP', 'Late Fee', 'GST'];
const PAYMENT_METHODS = ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Other'];
const RECONCILIATION = ['Pending', 'Matched', 'Mismatch'];

async function requireBill(id) {
  const [rows] = await pool.execute('SELECT id, amount, bill_status FROM bills WHERE id = ?', [id]);
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
  let totalCents = 0;
  const normalized = items.map((item) => {
    if (!CATEGORIES.includes(item.category) || seen.has(item.category)) {
      throw ApiError.badRequest('Bill categories must be unique and valid.');
    }
    seen.add(item.category);
    const amount = Number(item.amount);
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(amountCents)
      || Math.abs((amount * 100) - amountCents) > 1e-7) {
      throw ApiError.badRequest('Each category amount must be a non-negative amount with up to two decimals.');
    }
    totalCents += amountCents;
    return { category: item.category, amount: (amountCents / 100).toFixed(2) };
  });
  const billCents = Math.round(Number(bill.amount) * 100);
  if (totalCents !== billCents) {
    throw ApiError.badRequest(`Category total (${(totalCents / 100).toFixed(2)}) must equal bill total (${(billCents / 100).toFixed(2)}).`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingPayments] = await connection.execute(
      'SELECT COUNT(*) AS total FROM bill_payments WHERE bill_id = ?', [billId],
    );
    if (Number(existingPayments[0].total) > 0) {
      throw ApiError.conflict('Bill bifurcation cannot be changed after payments have been recorded.');
    }
    for (const item of normalized) {
      await connection.execute(
        `INSERT INTO bill_items (bill_id, category, amount) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
        [billId, item.category, item.amount],
      );
    }
    await connection.execute(
      `UPDATE bill_approvals SET approval_status = 'Pending', reviewed_by = NULL,
          request_note = 'Bill bifurcation changed; review again.', review_note = NULL,
          requested_at = CURRENT_TIMESTAMP, reviewed_at = NULL
        WHERE bill_id = ?`,
      [billId],
    );
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
      outstandingBalance: bill.bill_status === 'Paid' ? 0 : Math.max(0, Number(bill.amount) - summary.settledAmount),
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
    const [approvalRows] = await connection.execute(
      'SELECT approval_status FROM bill_approvals WHERE bill_id = ?',
      [billId],
    );
    if (!approvalRows.length || approvalRows[0].approval_status !== 'Approved') {
      throw ApiError.badRequest('The bill must be approved before recording a payment.');
    }
    const [totals] = await connection.execute(
      'SELECT COALESCE(SUM(amount_paid + tds_amount), 0) AS settled FROM bill_payments WHERE bill_id = ?',
      [billId],
    );
    // Compare integer paise, not floating-point rupees with a tolerance.
    // A one-paise shortfall must never silently mark a bill as fully paid.
    const settledCents = Math.round(Number(totals[0].settled) * 100);
    const billCents = Math.round(Number(existingRows[0].amount) * 100);
    const paymentCents = Math.round(paid * 100);
    const tdsCents = Math.round(tds * 100);
    if (settledCents + paymentCents + tdsCents > billCents) {
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
    const newSettledCents = settledCents + paymentCents + tdsCents;
    if (newSettledCents >= billCents) {
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


const getAmortization = asyncHandler(async (req, res) => {
  const bill = await requireBill(req.params.id);
  const [rows] = await pool.execute(
    'SELECT id, amortization_month, amount FROM bill_amortizations WHERE bill_id = ? ORDER BY amortization_month',
    [req.params.id],
  );
  return new ApiResponse(200, {
    billId: Number(bill.id),
    schedule: rows.map((row) => ({ id: row.id, month: row.amortization_month, amount: Number(row.amount) })),
    total: Number(rows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)),
  }).send(res);
});

const saveAmortization = asyncHandler(async (req, res) => {
  const billId = Number(req.params.id);
  const bill = await requireBill(billId);
  const months = Number(req.body.months);
  const startMonth = String(req.body.startMonth || '');
  if (![3, 6].includes(months)) throw ApiError.badRequest('Prepaid amortization must be scheduled over 3 or 6 months.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) {
    throw ApiError.badRequest('Choose a valid start month in YYYY-MM format.');
  }

  const totalCents = Math.round(Number(bill.amount) * 100);
  const baseCents = Math.floor(totalCents / months);
  const remainder = totalCents - (baseCents * months);
  const [year, month] = startMonth.split('-').map(Number);
  const schedule = Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
    };
  });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM bill_amortizations WHERE bill_id = ?', [billId]);
    for (const entry of schedule) {
      await connection.execute(
        'INSERT INTO bill_amortizations (bill_id, amortization_month, amount, created_by) VALUES (?, ?, ?, ?)',
        [billId, entry.month, entry.amount.toFixed(2), req.user.id],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getAmortization(req, res);
});

const getApproval = asyncHandler(async (req, res) => {
  await requireBill(req.params.id);
  const [rows] = await pool.execute(
    `SELECT a.id, a.approval_status, a.request_note, a.review_note, a.requested_at, a.reviewed_at,
            requester.full_name AS requested_by_name, reviewer.full_name AS reviewed_by_name
       FROM bill_approvals a
       JOIN users requester ON requester.id = a.requested_by
       LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
      WHERE a.bill_id = ?`,
    [req.params.id],
  );
  return new ApiResponse(200, { approval: rows[0] || null }).send(res);
});

const requestApproval = asyncHandler(async (req, res) => {
  const billId = Number(req.params.id);
  await requireBill(billId);
  const requestNote = String(req.body.requestNote || '').trim();
  if (requestNote.length > 1000) throw ApiError.badRequest('Approval request note must be 1000 characters or fewer.');
  const [existing] = await pool.execute('SELECT approval_status FROM bill_approvals WHERE bill_id = ?', [billId]);
  if (existing.length && existing[0].approval_status === 'Approved') {
    throw ApiError.conflict('This bill has already been approved.');
  }
  await pool.execute(
    `INSERT INTO bill_approvals (bill_id, approval_status, requested_by, request_note)
     VALUES (?, 'Pending', ?, ?)
     ON DUPLICATE KEY UPDATE approval_status = 'Pending', requested_by = VALUES(requested_by),
       reviewed_by = NULL, request_note = VALUES(request_note), review_note = NULL,
       requested_at = CURRENT_TIMESTAMP, reviewed_at = NULL`,
    [billId, req.user.id, requestNote || null],
  );
  return getApproval(req, res);
});

const reviewApproval = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Admin') throw ApiError.forbidden('Only an Admin can approve or reject a bill.');
  const billId = Number(req.params.id);
  await requireBill(billId);
  const { status, reviewNote = '' } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    throw ApiError.badRequest('Approval status must be Approved or Rejected.');
  }
  if (String(reviewNote).length > 1000) throw ApiError.badRequest('Review note must be 1000 characters or fewer.');
  const [result] = await pool.execute(
    `UPDATE bill_approvals SET approval_status = ?, reviewed_by = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE bill_id = ? AND approval_status = 'Pending'`,
    [status, req.user.id, String(reviewNote).trim() || null, billId],
  );
  if (!result.affectedRows) throw ApiError.conflict('No pending approval request exists for this bill.');
  return getApproval(req, res);
});

const exportPaymentsCsv = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT c.centre_name, b.invoice_number, b.bill_month, b.amount AS bill_amount,
            p.payment_date, p.amount_paid, p.tds_amount, p.payment_method,
            p.transaction_reference, p.reconciliation_status, p.remarks, u.full_name AS recorded_by
       FROM bill_payments p
       JOIN bills b ON b.id = p.bill_id
       JOIN centres c ON c.id = b.centre_id
       JOIN users u ON u.id = p.created_by
      ORDER BY p.payment_date DESC, p.id DESC`,
  );
  const columns = ['Centre','Invoice Number','Bill Month','Bill Amount','Payment Date','Bank Amount Paid','TDS Withheld','Payment Method','Transaction Reference','Reconciliation Status','Remarks','Recorded By'];
  const escapeCsv = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns, ...rows.map((row) => [
    row.centre_name, row.invoice_number, row.bill_month, row.bill_amount, row.payment_date,
    row.amount_paid, row.tds_amount, row.payment_method, row.transaction_reference,
    row.reconciliation_status, row.remarks, row.recorded_by,
  ])].map((row) => row.map(escapeCsv).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="centre-bill-payments.csv"');
  return res.status(200).send(`\\uFEFF${lines.join('\r\n')}`);
});

module.exports = { getBreakdown, saveBreakdown, listPayments, createPayment, listAttachments, uploadAttachment, downloadAttachment, getAmortization, saveAmortization, getApproval, requestApproval, reviewApproval, exportPaymentsCsv };
