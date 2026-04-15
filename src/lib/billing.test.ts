import assert from 'node:assert/strict';
import test from 'node:test';
import { computeBillSnapshot, toMoneyNumber } from './billing';

test('computeBillSnapshot derives partial and mixed payment state', () => {
  const summary = computeBillSnapshot(
    [{ line_total: 300 }, { line_total: 200 }],
    [
      { amount: 250, payment_mode: 'cash', payment_status: 'recorded' },
      { amount: 100, payment_mode: 'upi', payment_status: 'recorded' },
    ]
  );

  assert.equal(summary.subtotal_amount, 500);
  assert.equal(summary.total_amount, 500);
  assert.equal(summary.amount_paid, 350);
  assert.equal(summary.amount_due, 150);
  assert.equal(summary.status, 'partially_paid');
  assert.equal(summary.payment_display_mode, 'mixed');
  assert.equal(summary.payment_count, 2);
});

test('computeBillSnapshot keeps failed payments out of totals', () => {
  const summary = computeBillSnapshot(
    [{ line_total: 450 }],
    [{ amount: 450, payment_mode: 'upi', payment_status: 'failed' }]
  );

  assert.equal(summary.amount_paid, 0);
  assert.equal(summary.amount_due, 450);
  assert.equal(summary.status, 'open');
  assert.equal(summary.payment_display_mode, null);
  assert.equal(summary.payment_count, 0);
});

test('toMoneyNumber parses strings safely', () => {
  assert.equal(toMoneyNumber('1,250.50'), 1250.5);
  assert.equal(toMoneyNumber(''), null);
  assert.equal(toMoneyNumber('-10'), null);
  assert.equal(toMoneyNumber(undefined), null);
});

