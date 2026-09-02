/**
 * Bond repayment calculation logic.
 * Kept free of DOM access so it can be unit tested and reused.
 */
(function (root) {
  /**
   * Standard monthly repayment for a fully amortising loan.
   * @param {number} loanAmount - principal owed
   * @param {number} annualRatePct - nominal annual interest rate, e.g. 11.25
   * @param {number} termYears - loan term in years
   * @returns {number} monthly repayment
   */
  function calculateMonthlyRepayment(loanAmount, annualRatePct, termYears) {
    const monthlyRate = annualRatePct / 100 / 12;
    const numPayments = termYears * 12;

    if (loanAmount <= 0 || numPayments <= 0) return 0;
    if (monthlyRate === 0) return loanAmount / numPayments;

    const factor = Math.pow(1 + monthlyRate, numPayments);
    return (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  /**
   * Amortises a loan given a fixed monthly payment, allowing the payment to
   * exceed the standard repayment. Simulates month by month since extra
   * payments shorten the term rather than the payment amount.
   * @param {number} loanAmount
   * @param {number} annualRatePct
   * @param {number} monthlyPayment - actual amount paid each month
   * @returns {{months: number, totalPaid: number, totalInterest: number}}
   */
  function amortize(loanAmount, annualRatePct, monthlyPayment) {
    const monthlyRate = annualRatePct / 100 / 12;
    let balance = loanAmount;
    let totalPaid = 0;
    let months = 0;

    // Guard against a payment too small to ever cover the interest.
    const minViablePayment = balance * monthlyRate;
    if (monthlyPayment <= minViablePayment && monthlyRate > 0) {
      return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity };
    }

    const MAX_MONTHS = 12 * 100; // safety cap: 100 years
    while (balance > 0 && months < MAX_MONTHS) {
      const interest = balance * monthlyRate;
      let payment = monthlyPayment;
      if (payment > balance + interest) payment = balance + interest;

      balance = balance + interest - payment;
      totalPaid += payment;
      months += 1;
    }

    return {
      months,
      totalPaid,
      totalInterest: totalPaid - loanAmount,
    };
  }

  /**
   * Amortises a loan where, on top of the fixed standard repayment, an
   * extra monthly contribution is paid that grows by a fixed percentage
   * at the start of every subsequent year (e.g. R1,000 extra with a 10%
   * yearly escalation becomes R1,100 extra from month 13).
   * @param {number} loanAmount
   * @param {number} annualRatePct
   * @param {number} standardPayment - fixed standard monthly repayment
   * @param {number} extraPayment - additional amount paid in year 1
   * @param {number} escalationPct - yearly increase applied to extraPayment
   * @returns {{months: number, totalPaid: number, totalInterest: number}}
   */
  function amortizeWithEscalatingExtra(loanAmount, annualRatePct, standardPayment, extraPayment, escalationPct) {
    const monthlyRate = annualRatePct / 100 / 12;
    let balance = loanAmount;
    let totalPaid = 0;
    let months = 0;

    const MAX_MONTHS = 12 * 100; // safety cap: 100 years
    while (balance > 0 && months < MAX_MONTHS) {
      const yearIndex = Math.floor(months / 12);
      const currentExtra = extraPayment * Math.pow(1 + escalationPct / 100, yearIndex);
      const interest = balance * monthlyRate;
      let payment = standardPayment + currentExtra;
      if (payment > balance + interest) payment = balance + interest;

      balance = balance + interest - payment;
      totalPaid += payment;
      months += 1;
    }

    if (balance > 0) {
      return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity };
    }

    return {
      months,
      totalPaid,
      totalInterest: totalPaid - loanAmount,
    };
  }

  /**
   * Full calculation used by the calculator UI: standard repayment plus,
   * optionally, the effect of an additional monthly contribution that can
   * escalate by a fixed percentage every year.
   */
  function calculateBond({
    purchasePrice,
    deposit = 0,
    annualRatePct,
    termYears,
    extraPayment = 0,
    escalationPct = 0,
  }) {
    const loanAmount = Math.max(purchasePrice - deposit, 0);
    const monthlyRepayment = calculateMonthlyRepayment(loanAmount, annualRatePct, termYears);
    const standard = amortize(loanAmount, annualRatePct, monthlyRepayment);

    const result = {
      loanAmount,
      monthlyRepayment,
      standardTermMonths: termYears * 12,
      totalPaidStandard: standard.totalPaid,
      totalInterestStandard: standard.totalInterest,
    };

    if (extraPayment > 0) {
      const withExtra = amortizeWithEscalatingExtra(
        loanAmount,
        annualRatePct,
        monthlyRepayment,
        extraPayment,
        escalationPct
      );
      result.newMonthlyPayment = monthlyRepayment + extraPayment;
      result.escalationPct = escalationPct;
      result.newTermMonths = withExtra.months;
      result.totalPaidWithExtra = withExtra.totalPaid;
      result.totalInterestWithExtra = withExtra.totalInterest;
      result.interestSaved = standard.totalInterest - withExtra.totalInterest;
      result.timeSavedMonths = result.standardTermMonths - withExtra.months;
    }

    return result;
  }

  const api = { calculateMonthlyRepayment, amortize, amortizeWithEscalatingExtra, calculateBond };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.BondCalculator = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
