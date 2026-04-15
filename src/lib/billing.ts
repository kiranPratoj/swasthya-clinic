import type { BillLineItem, BillSummary, PaymentEvent } from './types';

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function toMoneyNumber(value: FormDataEntryValue | string | number | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  const raw = typeof value === 'number' ? String(value) : String(value).trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(/,/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return roundMoney(parsed);
}

export function computeBillSnapshot(
  lineItems: Array<Pick<BillLineItem, 'line_total'>>,
  payments: Array<Pick<PaymentEvent, 'amount' | 'payment_mode' | 'payment_status'>>,
  discountAmount = 0
): Omit<BillSummary, 'bill_id'> & { subtotal_amount: number; discount_amount: number } {
  const subtotalAmount = roundMoney(
    lineItems.reduce((total, item) => total + roundMoney(item.line_total), 0)
  );
  const normalizedDiscount = roundMoney(Math.max(discountAmount, 0));
  const totalAmount = roundMoney(Math.max(subtotalAmount - normalizedDiscount, 0));
  const successfulPayments = payments.filter((payment) => payment.payment_status === 'recorded');
  const amountPaid = roundMoney(
    successfulPayments.reduce((total, payment) => total + roundMoney(payment.amount), 0)
  );
  const amountDue = roundMoney(Math.max(totalAmount - amountPaid, 0));

  let status: BillSummary['status'] = 'draft';
  if (totalAmount > 0 && amountPaid <= 0) {
    status = 'open';
  } else if (totalAmount > 0 && amountPaid > 0 && amountDue > 0) {
    status = 'partially_paid';
  } else if (totalAmount > 0 && amountDue <= 0) {
    status = 'paid';
  }

  const paymentModes = [...new Set(successfulPayments.map((payment) => payment.payment_mode))];
  const paymentDisplayMode =
    paymentModes.length === 0
      ? null
      : paymentModes.length === 1
        ? paymentModes[0]
        : 'mixed';

  return {
    status,
    subtotal_amount: subtotalAmount,
    discount_amount: normalizedDiscount,
    total_amount: totalAmount,
    amount_paid: amountPaid,
    amount_due: amountDue,
    payment_display_mode: paymentDisplayMode,
    payment_count: successfulPayments.length,
  };
}

