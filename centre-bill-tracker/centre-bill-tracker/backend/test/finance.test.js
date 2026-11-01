const test = require('node:test');
const assert = require('node:assert/strict');
const { toPaise, paymentFitsOutstanding } = require('../src/utils/finance');

test('converts rupees to integer paise without floating point drift', () => {
  assert.equal(toPaise(0.1 + 0.2), 30);
  assert.equal(toPaise('1250.75'), 125075);
});

test('rejects invalid, negative precision and unsafe money amounts', () => {
  assert.throws(() => toPaise('not-money'), TypeError);
  assert.throws(() => toPaise(1.001), TypeError);
  assert.throws(() => toPaise(Number.MAX_SAFE_INTEGER), TypeError);
});

test('payment and TDS cannot exceed outstanding balance, including one paise', () => {
  assert.equal(paymentFitsOutstanding(9000, 900, 100, 10000), true);
  assert.equal(paymentFitsOutstanding(9000, 901, 100, 10000), false);
  assert.equal(paymentFitsOutstanding(0, 10000, 0, 10000), true);
  assert.equal(paymentFitsOutstanding(0, 10001, 0, 10000), false);
});

test('only positive bank payment and non-negative TDS are accepted', () => {
  assert.equal(paymentFitsOutstanding(0, 0, 100, 10000), false);
  assert.equal(paymentFitsOutstanding(0, 100, -1, 10000), false);
});
