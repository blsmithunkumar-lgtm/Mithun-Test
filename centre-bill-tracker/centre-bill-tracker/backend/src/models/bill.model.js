const { pool } = require('../config/db');

const BASE_SELECT = `
  SELECT
    b.id, b.centre_id, b.bill_month, b.invoice_number, b.invoice_date,
    b.due_date, b.amount, b.bill_status, b.payment_date, b.remarks,
    b.created_by, b.created_at, b.updated_at,
    c.centre_name, c.vendor_name,
    u.full_name AS created_by_name
  FROM bills b
  JOIN centres c ON c.id = b.centre_id
  JOIN users u ON u.id = b.created_by
`;

/**
 * Lists bills with optional filters:
 * - search: matches centre name (SRD section 8 - search is centre-name only)
 * - status: exact bill_status match
 * - limit: caps result count (used by the dashboard's "latest bills" widget)
 * - orderBy: 'dueDate' (default - soonest due first, used by the Bills page)
 *            or 'recent' (most recently added first, used by the dashboard's
 *            "latest bills" widget, which shows what's newly on record rather
 *            than what's most urgent)
 */
async function findAll({ search, status, limit, orderBy = 'dueDate' } = {}) {
  const conditions = [];
  const params = [];

  if (search && search.trim() !== '') {
    conditions.push('c.centre_name LIKE ?');
    params.push(`%${search.trim()}%`);
  }
  if (status) {
    conditions.push('b.bill_status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = orderBy === 'recent'
    ? 'ORDER BY b.created_at DESC, b.id DESC'
    : 'ORDER BY b.due_date ASC, b.created_at DESC';
  let sql = `${BASE_SELECT} ${whereClause} ${orderClause}`;

  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE b.id = ?`, [id]);
  return rows[0] || null;
}

async function findByInvoiceNumber(invoiceNumber, excludeId = null) {
  let sql = 'SELECT id FROM bills WHERE invoice_number = ?';
  const params = [invoiceNumber];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

/**
 * Enforces "one bill per centre per bill_month" (SRD section 9 / schema
 * unique constraint) with a friendly pre-check before hitting the DB
 * constraint.
 */
async function findByCentreAndMonth(centreId, billMonth, excludeId = null) {
  let sql = 'SELECT id FROM bills WHERE centre_id = ? AND bill_month = ?';
  const params = [centreId, billMonth];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function create({
  centreId, billMonth, invoiceNumber, invoiceDate, dueDate, amount, remarks, createdBy,
}) {
  const [result] = await pool.query(
    `INSERT INTO bills
       (centre_id, bill_month, invoice_number, invoice_date, due_date, amount, bill_status, remarks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
    [centreId, billMonth, invoiceNumber, invoiceDate, dueDate, amount, remarks || null, createdBy],
  );
  return findById(result.insertId);
}

async function update(id, {
  centreId, billMonth, invoiceNumber, invoiceDate, dueDate, amount, remarks,
}) {
  await pool.query(
    `UPDATE bills
     SET centre_id = ?, bill_month = ?, invoice_number = ?, invoice_date = ?,
         due_date = ?, amount = ?, remarks = ?
     WHERE id = ?`,
    [centreId, billMonth, invoiceNumber, invoiceDate, dueDate, amount, remarks || null, id],
  );
  return findById(id);
}

/**
 * Advances bill_status to the given value. payment_date is set to today
 * automatically by the caller only when transitioning to 'Paid' - this
 * function just persists whatever the controller decided.
 */
async function updateStatus(id, status, paymentDate = null) {
  await pool.query(
    'UPDATE bills SET bill_status = ?, payment_date = ? WHERE id = ?',
    [status, paymentDate, id],
  );
  return findById(id);
}

/**
 * Dashboard summary counts, computed live from the bills table per the
 * SRD's rule that the dashboard always reflects current data. Overdue and
 * "due in 7 days" are derived from due_date at query time, never stored.
 */
async function getSummaryCounts() {
  const [[totals]] = await pool.query(`
    SELECT
      SUM(CASE WHEN bill_status = 'Received' THEN 1 ELSE 0 END) AS bills_received,
      SUM(CASE WHEN bill_status = 'Pending' THEN 1 ELSE 0 END) AS bills_pending,
      SUM(CASE WHEN bill_status != 'Paid' AND due_date >= CURDATE() AND due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS due_in_7_days,
      SUM(CASE WHEN bill_status != 'Paid' AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_bills
    FROM bills
  `);
  return {
    billsReceived: Number(totals.bills_received) || 0,
    billsPending: Number(totals.bills_pending) || 0,
    dueInSevenDays: Number(totals.due_in_7_days) || 0,
    overdueBills: Number(totals.overdue_bills) || 0,
  };
}

module.exports = {
  findAll,
  findById,
  findByInvoiceNumber,
  findByCentreAndMonth,
  create,
  update,
  updateStatus,
  getSummaryCounts,
};
