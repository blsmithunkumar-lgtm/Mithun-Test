const test = require('node:test');
const assert = require('node:assert/strict');
const { writeAuditLog } = require('../src/utils/auditLog');

test('writes audit rows through the supplied transaction executor', async () => {
  const calls = [];
  const executor = { execute: async (sql, params) => { calls.push({ sql, params }); } };
  await writeAuditLog({
    executor, throwOnError: true, billId: 7, actorUserId: 3,
    action: 'payment.recorded', entityType: 'bill_payment', entityId: 42,
    details: { amountPaid: 100, tdsAmount: 10 },
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /INSERT INTO bill_audit_logs/);
  assert.deepEqual(calls[0].params, [7, 3, 'payment.recorded', 'bill_payment', '42', '{"amountPaid":100,"tdsAmount":10}']);
});

test('critical audit failure is rethrown so the transaction can roll back', async () => {
  const failure = new Error('audit table unavailable');
  const executor = { execute: async () => { throw failure; } };
  await assert.rejects(
    writeAuditLog({ executor, throwOnError: true, action: 'payment.recorded', entityType: 'bill_payment' }),
    (error) => error === failure,
  );
});

test('non-critical audit failure remains best-effort', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(writeAuditLog({
      executor: { execute: async () => { throw new Error('temporary audit outage'); } },
      action: 'bill.updated', entityType: 'bill',
    }));
  } finally {
    console.error = originalError;
  }
});
