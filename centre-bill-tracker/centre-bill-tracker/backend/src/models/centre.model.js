const { pool } = require('../config/db');

const BASE_SELECT = `
  SELECT
    c.id, c.centre_name, c.vendor_name, c.wifi_id, c.account_number,
    c.service_type, c.contract_expiry_date,
    c.status, c.created_at, c.updated_at,
    COUNT(b.id) AS bill_count
  FROM centres c
  LEFT JOIN bills b ON b.centre_id = c.id
`;

/**
 * Returns centres, optionally filtered by centre_name search (SRD section 8)
 * and/or status. Includes a bill_count so the frontend can decide whether
 * a centre is eligible for hard delete (zero bills) or must be deactivated.
 */
async function findAll({ search, status } = {}) {
  const conditions = [];
  const params = [];

  if (search && search.trim() !== '') {
    conditions.push('c.centre_name LIKE ?');
    params.push(`%${search.trim()}%`);
  }
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `${BASE_SELECT} ${whereClause} GROUP BY c.id ORDER BY c.centre_name ASC`;

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE c.id = ? GROUP BY c.id`, [id]);
  return rows[0] || null;
}

async function findByAccountNumber(accountNumber, excludeId = null) {
  if (!accountNumber) return null;
  let sql = 'SELECT id FROM centres WHERE account_number = ?';
  const params = [accountNumber];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function create({ centreName, vendorName, wifiId, accountNumber, serviceType, contractExpiryDate }) {
  const [result] = await pool.query(
    `INSERT INTO centres (centre_name, vendor_name, wifi_id, account_number, service_type, contract_expiry_date, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
    [
      centreName,
      vendorName || null,
      wifiId || null,
      accountNumber || null,
      serviceType || null,
      contractExpiryDate || null,
    ],
  );
  return findById(result.insertId);
}

async function update(id, { centreName, vendorName, wifiId, accountNumber, serviceType, contractExpiryDate }) {
  await pool.query(
    `UPDATE centres
     SET centre_name = ?, vendor_name = ?, wifi_id = ?, account_number = ?, service_type = ?, contract_expiry_date = ?
     WHERE id = ?`,
    [
      centreName,
      vendorName || null,
      wifiId || null,
      accountNumber || null,
      serviceType || null,
      contractExpiryDate || null,
      id,
    ],
  );
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query('UPDATE centres SET status = ? WHERE id = ?', [status, id]);
  return findById(id);
}

async function countBills(id) {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM bills WHERE centre_id = ?', [id]);
  return rows[0].count;
}

async function remove(id) {
  await pool.query('DELETE FROM centres WHERE id = ?', [id]);
}

/**
 * Total centre count for the dashboard's "Total Centres" card (SRD section 4).
 * Counts all centres regardless of status, matching the SRD's plain wording.
 */
async function countAll() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM centres');
  return rows[0].count;
}

module.exports = {
  findAll,
  findById,
  findByAccountNumber,
  create,
  update,
  updateStatus,
  countBills,
  remove,
  countAll,
};
  
