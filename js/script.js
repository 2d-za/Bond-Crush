(function () {
  const form = document.getElementById('bond-form');
  const resultsSection = document.getElementById('results');
  const extraResultsSection = document.getElementById('extra-results');

  const currencyFormatter = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  });

  function formatCurrency(value) {
    if (!isFinite(value)) return 'Never pays off';
    return currencyFormatter.format(value);
  }

  function formatMonths(totalMonths) {
    if (!isFinite(totalMonths)) return 'Never';
    const years = Math.floor(totalMonths / 12);
    const months = Math.round(totalMonths % 12);
    const parts = [];
    if (years > 0) parts.push(`${years} yr${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} mo${months !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(' ') : '0 months';
  }

  function readInputs() {
    return {
      purchasePrice: parseFloat(document.getElementById('purchase-price').value) || 0,
      deposit: parseFloat(document.getElementById('deposit').value) || 0,
      annualRatePct: parseFloat(document.getElementById('interest-rate').value) || 0,
      termYears: parseFloat(document.getElementById('loan-term').value) || 0,
      extraPayment: parseFloat(document.getElementById('extra-payment').value) || 0,
      escalationPct: parseFloat(document.getElementById('escalation-rate').value) || 0,
    };
  }

  function render(result) {
    resultsSection.hidden = false;

    document.getElementById('out-loan-amount').textContent = formatCurrency(result.loanAmount);
    document.getElementById('out-monthly-repayment').textContent = formatCurrency(result.monthlyRepayment);
    document.getElementById('out-total-standard').textContent = formatCurrency(result.totalPaidStandard);
    document.getElementById('out-interest-standard').textContent = formatCurrency(result.totalInterestStandard);

    if (result.newTermMonths !== undefined) {
      extraResultsSection.hidden = false;
      const paymentLabel = document.getElementById('out-new-payment-label');
      paymentLabel.textContent = result.escalationPct > 0 ? 'New monthly payment (year 1)' : 'New monthly payment';
      document.getElementById('out-new-payment').textContent = formatCurrency(result.newMonthlyPayment);
      document.getElementById('out-new-term').textContent = formatMonths(result.newTermMonths);
      document.getElementById('out-total-extra').textContent = formatCurrency(result.totalPaidWithExtra);
      document.getElementById('out-interest-extra').textContent = formatCurrency(result.totalInterestWithExtra);
      document.getElementById('out-interest-saved').textContent = formatCurrency(result.interestSaved);
      document.getElementById('out-time-saved').textContent = formatMonths(result.timeSavedMonths);
    } else {
      extraResultsSection.hidden = true;
    }
  }

  function recalculate() {
    const inputs = readInputs();
    if (inputs.purchasePrice <= 0 || inputs.termYears <= 0) {
      resultsSection.hidden = true;
      return;
    }
    const result = window.BondCalculator.calculateBond(inputs);
    render(result);
  }

  form.addEventListener('input', recalculate);
  recalculate();
})();
