function toPaise(value) {
  const amount = Number(value);
  const paise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(paise)
    || Math.abs((amount * 100) - paise) > 1e-7) {
    throw new TypeError('Amount must be a finite value with up to two decimal places.');
  }
  return paise;
}

function paymentFitsOutstanding(settledPaise, paymentPaise, tdsPaise, billPaise) {
  return [settledPaise, paymentPaise, tdsPaise, billPaise].every(Number.isSafeInteger)
    && settledPaise >= 0 && paymentPaise > 0 && tdsPaise >= 0 && billPaise >= 0
    && settledPaise + paymentPaise + tdsPaise <= billPaise;
}

module.exports = { toPaise, paymentFitsOutstanding };
