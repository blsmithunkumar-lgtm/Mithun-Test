const { pool } = require('../config/db');
const { writeAuditLog } = require('../utils/auditLog');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { toPaise, paymentFitsOutstanding } = require('../utils/finance');
const { validateInvoiceFile } = require('../utils/invoiceFile');

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
  const bill = await requireBi...[truncated]