(function () {
  const form = document.getElementById('bond-form');
  const resultsSection = document.getElementById('results');
  const extraResultsSection = document.getElementById('extra-results');
  const scheduleCard = document.getElementById('schedule-card');
  const scheduleTable = document.getElementById('schedule-table');
  const scheduleBody = document.getElementById('schedule-body');
  const scheduleSummary = document.getElementById('schedule-summary');
  const chartCard = document.getElementById('chart-card');
  const chartSvg = document.getElementById('balance-chart');
  const legendExtra = document.getElementById('legend-extra');

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

  function formatCompactCurrency(value) {
    if (value >= 1000000) return 'R' + (value / 1000000).toFixed(1) + 'M';
    return 'R' + Math.round(value / 1000) + 'k';
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

    renderSchedule(result);
    drawChart(result);
  }

  function drawChart(result) {
    const hasExtra = result.newTermMonths !== undefined;
    chartCard.hidden = false;
    legendExtra.hidden = !hasExtra;

    const W = 640,
      H = 220,
      padL = 54,
      padR = 14,
      padT = 14,
      padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxX = result.standardTermMonths / 12;
    const maxY = result.loanAmount;

    const standardPoints = [{ x: 0, y: result.loanAmount }].concat(
      result.schedule.map((row) => ({ x: row.year, y: row.standardBalance }))
    );
    const extraPoints = hasExtra
      ? [{ x: 0, y: result.loanAmount }].concat(result.schedule.map((row) => ({ x: row.year, y: row.extraBalance })))
      : null;

    function toPath(points) {
      return points
        .map((p, i) => {
          const x = padL + (p.x / maxX) * plotW;
          const y = padT + (1 - p.y / maxY) * plotH;
          return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        })
        .join(' ');
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const accentColor = rootStyles.getPropertyValue('--accent').trim();
    const highlightColor = rootStyles.getPropertyValue('--highlight-text').trim();
    const lineColor = rootStyles.getPropertyValue('--border').trim();

    let gridLines = '';
    for (let i = 0; i <= 4; i++) {
      const y = padT + (i / 4) * plotH;
      const value = maxY * (1 - i / 4);
      gridLines += `<line x1="${padL}" x2="${W - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(
        1
      )}" stroke="${lineColor}" stroke-width="1"/>`;
      gridLines += `<text x="${padL - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end">${formatCompactCurrency(
        value
      )}</text>`;
    }

    const yearsTotal = Math.round(maxX);
    const step = yearsTotal > 15 ? 5 : yearsTotal > 6 ? 2 : 1;
    let xLabels = '';
    for (let yr = 0; yr <= yearsTotal; yr += step) {
      const x = padL + (yr / maxX) * plotW;
      xLabels += `<text x="${x.toFixed(1)}" y="${H - 8}" text-anchor="middle">yr ${yr}</text>`;
    }

    let marker = '';
    if (hasExtra && result.newTermMonths < result.standardTermMonths) {
      const payoffPoint = extraPoints.find((p) => p.y <= 0);
      if (payoffPoint) {
        const x = padL + (payoffPoint.x / maxX) * plotW;
        const y = padT + plotH;
        marker = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${highlightColor}"/>`;
      }
    }

    chartSvg.innerHTML =
      gridLines +
      xLabels +
      `<path d="${toPath(standardPoints)}" fill="none" stroke="${accentColor}" stroke-width="2"/>` +
      (hasExtra ? `<path d="${toPath(extraPoints)}" fill="none" stroke="${highlightColor}" stroke-width="2.25"/>` : '') +
      marker;
  }

  function renderSchedule(result) {
    const hasExtra = result.newTermMonths !== undefined;
    scheduleCard.hidden = false;
    scheduleTable.classList.toggle('no-extra', !hasExtra);

    if (hasExtra) {
      scheduleSummary.hidden = false;
      scheduleSummary.textContent = `Without the extra payment, the standard repayment stays fixed at ${formatCurrency(
        result.monthlyRepayment
      )} a month for the full ${formatMonths(result.standardTermMonths)} term. The table below shows your plan with the additional payment.`;
    } else {
      scheduleSummary.hidden = true;
    }

    const dash = '<span class="dash">&mdash;</span>';

    scheduleBody.innerHTML = '';
    result.schedule.forEach((row) => {
      const tr = document.createElement('tr');

      if (hasExtra) {
        const paymentCell = row.extraPayment !== null ? formatCurrency(row.extraPayment) : dash;
        const interestCell = row.extraInterest !== null ? formatCurrency(row.extraInterest) : dash;
        const balanceCell = row.extraJustPaidOff
          ? '<span class="paid-off">Paid off</span>'
          : formatCurrency(row.extraBalance);
        tr.innerHTML = `
          <td>${row.year}</td>
          <td class="extra-col">${paymentCell}</td>
          <td>${interestCell}</td>
          <td>${balanceCell}</td>
        `;
      } else {
        tr.innerHTML = `
          <td>${row.year}</td>
          <td class="extra-col"></td>
          <td>${formatCurrency(row.standardInterest)}</td>
          <td>${formatCurrency(row.standardBalance)}</td>
        `;
      }
      scheduleBody.appendChild(tr);
    });
  }

  function recalculate() {
    const inputs = readInputs();
    if (inputs.purchasePrice <= 0 || inputs.termYears <= 0) {
      resultsSection.hidden = true;
      scheduleCard.hidden = true;
      chartCard.hidden = true;
      return;
    }
    const result = window.BondCalculator.calculateBond(inputs);
    render(result);
  }

  form.addEventListener('input', recalculate);
  recalculate();
})();
