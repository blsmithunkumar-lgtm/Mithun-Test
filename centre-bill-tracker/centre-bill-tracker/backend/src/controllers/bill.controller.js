const billModel = require('../models/bill.model');
const { pool } = require('../config/db');
const { writeAuditLog } = require('../utils/auditLog');
const centreModel = require('../models/centre.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { toBillMonthLabel } = require('../utils/billMonth.util');

// The one legal "next status" for each current status (SRD section 9 /
// schema: Pending -> Received -> Paid, no skipping, no reverting).
const NEXT_STATUS = {
  Pending: 'Received',
  Received: 'Paid',
};

function toApiShape(bill) {
  return {
    id: bill.id,
    centreId: bill.centre_id,
    centreName: bill.centre_name,
    vendorName: bill.vendor_name,
    billMonth: bill.bill_month,
    invoiceNumber: bill.invoice_number,
    invoiceDate: bill.invoice_date,
    dueDate: bill.due_date,
    amount: Number(bill.amount),
    billStatus: bill.bill_status,
    paymentDate: bill.payment_date,
    remarks: bill.remarks,
    createdBy: bill.created_by,
    createdByName: bill.created_by_name,
    createdAt: bill.created_at,
    updatedAt: bill.updated_at,
  };
}

/**
 * GET /api/bills?search=&status=&limit=
 * Admin + Operations. Search is by centre name only (SRD section 8).
 */
const listBills = asyncHandler(async (req, res) => {
  const { search, status, limit } = req.query;
  const bills = await billModel.findAll({ search, status, limit });
  return new ApiResponse(200, { bills: bills.map(toApiShape) }).send(res);
});

/**
 * POST /api/bills
 * Admin + Operations. Always created as 'Pending' regardless of what the
 * client sends - status is never client-settable on create.
 */
const createBill = asyncHandler(async (req, res) => {
  const { centreId, billMonth, invoiceNumber, invoiceDate, dueDate, amount, remarks } = req.body;

  const centre = await centreModel.findById(centreId);
  if (!centre) {
    throw ApiError.badRequest('Selected centre does not exist.');
  }

  const billMonthLabel = toBillMonthLabel(billMonth);

  const duplicateInvoice = await billModel.findByInvoiceNumber(invoiceNumber);
  if (duplicateInvoice) {
    throw ApiError.conflict('A bill with this invoice number already exists.');
  }

  const duplicateMonth = await billModel.findByCentreAndMonth(centreId, billMonthLabel);
  if (duplicateMonth) {
    throw ApiError.conflict(`A bill for "${centre.centre_name}" in ${billMonthLabel} already exists.`);
  }

  const bill = await billModel.create({
    centreId,
    billMonth: billMonthLabel,
    invoiceNumber,
    invoiceDate,
    dueDate,
    amount,
    remarks,
    createdBy: req.user.id,
  });

  await writeAuditLog({ billId: bill.id, actorUserId: req.user.id, action: 'bill.created', entityType: 'bill', entityId: bill.id, details: { invoiceNumber, amount: Number(amount), centreId, billMonth: billMonthLabel } });
  return new ApiResponse(201, { bill: toApiShape(bill) }, 'Bill created successfully').send(res);
});

/**
 * PUT /api/bills/:id
 * Admin only - full field edit.
 */
const updateBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { centreId, billMonth, invoiceNumber, invoiceDate, dueDate, amount, remarks } = req.body;

  const existingBill = await billModel.findById(id);
  if (!existingBill) {
    throw ApiError.notFound('Bill not found.');
  }

  const centre = await centreModel.findById(centreId);
  if (!centre) {
    throw ApiError.badRequest('Selected centre does not exist.');
  }

  const billMonthLabel = toBillMonthLabel(billMonth);

  const duplicateInvoice = await billModel.findByInvoiceNumber(invoiceNumber, id);
  if (duplicateInvoice) {
    throw ApiError.conflict('A bill with this invoice number already exists.');
  }

  const duplicateMonth = await billModel.findByCentreAndMonth(centreId, billMonthLabel, id);
  if (duplicateMonth) {
    throw ApiError.conflict(`A bill for "${centre.centre_name}" in ${billMonthLabel} already exists.`);
  }

  const [existingPayments] = await pool.execute(
    'SELECT COUNT(*) AS total FROM bill_payments WHERE bill_id = ?', [id],
  );
  if (Number(existingPayments[0].total) > 0) {
    throw ApiError.conflict('A bill with recorded payments cannot be edited. Add a finance adjustment workflow instead.');
  }

  const updated = await billModel.update(id, {
    centreId, billMonth: billMonthLabel, invoiceNumber, invoiceDate, dueDate, amount, remarks,
  });
  await pool.execute(
    `UPDATE bill_approvals
        SET approval_status = 'Pending', requested_by = ?, reviewed_by = NULL,
            request_note = 'Bill details changed; review again.', review_note = NULL,
            requested_at = CURRENT_TIMESTAMP, reviewed_at = NULL
      WHERE bill_id = ?`,
    [req.user.id, id],
  );

  await writeAuditLog({ billId: id, actorUserId: req.user.id, action: 'bill.updated', entityType: 'bill', entityId: id, details: { invoiceNumber, amount: Number(amount), centreId, billMonth: billMonthLabel } });
  return new ApiResponse(200, { bill: toApiShape(updated) }, 'Bill updated successfully').send(res);
});

/**
 * PATCH /api/bills/:id/status
 * Admin + Operations, but gated further inside:
 *   - Pending -> Received: Admin or Operations
 *   - Received -> Paid: Admin only, payment_date auto-set to today server-side
 * Any other requested transition is rejected regardless of role.
 */
const updateBillStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status: requestedStatus } = req.body;

  const existingBill = await billModel.findById(id);
  if (!existingBill) {
    throw ApiError.notFound('Bill not found.');
  }

  const currentStatus = existingBill.bill_status;
  const legalNextStatus = NEXT_STATUS[currentStatus];

  if (!legalNextStatus || legalNextStatus !== requestedStatus) {
    throw ApiError.badRequest(
      `Bill status cannot move from "${currentStatus}" to "${requestedStatus}". Status must follow Pending -> Received -> Paid in order.`,
    );
  }

  if (requestedStatus === 'Paid') {
    throw ApiError.badRequest('Record payments in the Finance panel; a bill is marked Paid when payments plus TDS settle the total.');
  }

  // payment_date is only ever populated by this server-side rule, never
  // accepted from the client (approved rule: auto-set to today, no manual entry).
  const paymentDate = requestedStatus === 'Paid' ? new Date().toISOString().slice(0, 10) : null;
  const updated = await billModel.updateStatus(id, requestedStatus, paymentDate);

  await writeAuditLog({ billId: id, actorUserId: req.user.id, action: 'bill.status_changed', entityType: 'bill', entityId: id, details: { from: currentStatus, to: requestedStatus } });
  return new ApiResponse(200, { bill: toApiShape(updated) }, `Bill marked as ${requestedStatus}`).send(res);
});

module.exports = { listBills, createBill, updateBill, updateBillStatus };
