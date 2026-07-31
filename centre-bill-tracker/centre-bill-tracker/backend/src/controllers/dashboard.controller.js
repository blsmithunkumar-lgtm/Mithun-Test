const centreModel = require('../models/centre.model');
const billModel = require('../models/bill.model');
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

module.exports = { getSummary, getLatestBills };
