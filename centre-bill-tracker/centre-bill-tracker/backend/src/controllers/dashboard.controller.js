const centreModel = require('../models/centre.model');
const billModel = require('../models/bill.model');
const { pool } = require('../config/db');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

function toBillApiShape(bill) {
  return {
    id: bill.id,
    centreId: bill.centre_id,
    centreName: bill.centre_name,
    billMonth: bill.bill_month,
    dueDate: bill.due_date,
    billStatus: bill.bill_status,
    amount: Number(bill.amount),
  };
}

const LATEST_BILLS_LIMIT = 10;

/**
 * GET /api/dashboard/summary
 * Admin + Operations. Returns the 5 summary cards from SRD section 4:
 * Total Centres, Bills Received, Bills Pending, Due in Next 7 Days, Overdue.
 * All figures are computed live from the current data (SRD section 9:
 * "Dashboard hamesha latest data dikhayega").
 */
const getSummary = asyncHandler(async (req, res) => {
  const [totalCentres, billCounts] = await Promise.all([
    centreModel.countAll(),
    billModel.getSummaryCounts(),
  ]);

  return new ApiResponse(200, {
    totalCentres,
    billsReceived: billCounts.billsReceived,
    billsPending: billCounts.billsPending,
    dueInSevenDays: billCounts.dueInSevenDays,
    overdueBills: billCounts.overdueBills,
  }).send(res);
});

/**
 * GET /api/dashboard/latest-bills
 * Admin + Operations. Feeds the "latest bills" list under the dashboard
 * cards (SRD section 4): Centre Name, Bill Month, Due Date, Status.
 */
const getLatestBills = asyncHandler(async (req, res) => {
  const bills = await billModel.findAll({ limit: LATEST_BILLS_LIMIT, orderBy: 'recent' });
  return new ApiResponse(200, { bills: bills.map(toBillApiShape) }).send(res);
});


const getFinanceSummary = asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS totalBills,
            SUM(CASE WHEN b.bill_status = 'Received' AND (a.approval_status IS NULL OR a.approval_status <> 'Approved') THEN 1 ELSE 0 END) AS awaitingApproval,
            SUM(CASE WHEN b.bill_status <> 'Paid' THEN GREATEST(b.amount - COALESCE(p.settled, 0), 0) ELSE 0 END) AS totalOutstanding,
            SUM(COALESCE(p.bank_paid, 0)) AS totalBankPaid,
            SUM(COALESCE(p.tds_withheld, 0)) AS totalTdsWithheld,
            SUM(CASE WHEN b.bill_status = 'Paid' THEN 1 ELSE 0 END) AS settledBills
       FROM bills b
       LEFT JOIN (
         SELECT bill_id, SUM(amount_paid) AS bank_paid, SUM(tds_amount) AS tds_withheld,
                SUM(amount_paid + tds_amount) AS settled
           FROM bill_payments GROUP BY bill_id
       ) p ON p.bill_id = b.id
       LEFT JOIN bill_approvals a ON a.bill_id = b.id`,
  );
  const row = rows[0];
  return new ApiResponse(200, {
    totalBills: Number(row.totalBills || 0),
    awaitingApproval: Number(row.awaitingApproval || 0),
    totalOutstanding: Number(Number(row.totalOutstanding || 0).toFixed(2)),
    totalBankPaid: Number(Number(row.totalBankPaid || 0).toFixed(2)),
    totalTdsWithheld: Number(Number(row.totalTdsWithheld || 0).toFixed(2)),
    settledBills: Number(row.settledBills || 0),
  }).send(res);
});

module.exports = { getSummary, getLatestBills, getFinanceSummary };
