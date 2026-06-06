(function(globalScope) {
  function markDebtPaid({ debts, debtId, activeMonthKey, now = new Date() }) {
    const list = Array.isArray(debts) ? debts : [];
    const debt = list.find((item) => item && item.id === debtId);
    if(!debt) return { ok: false, reason: 'not-found' };

    debt.pagado = !debt.pagado;
    if(debt.pagado && debt.mesKey === activeMonthKey) {
      debt.diaPagoReal = now.getDate();
    }

    return { ok: true, debt };
  }

  function buildDebtDueAlerts({ debts, activeMonthKey, systemMonthKey, now = new Date(), thresholdDays = 3 }) {
    if(!Array.isArray(debts)) return null;
    if(activeMonthKey !== systemMonthKey) return null;

    const today = now.getDate();
    const pendingDebts = debts
      .filter((debt) => debt && !debt.pagado)
      .map((debt) => ({ ...debt, dia: parseInt(debt.dia, 10) }))
      .filter((debt) => !Number.isNaN(debt.dia) && debt.dia >= 1 && debt.dia <= 31)
      .sort((left, right) => left.dia - right.dia);

    return {
      hoy: today,
      umbralDias: thresholdDays,
      vencidos: pendingDebts.filter((debt) => debt.dia < today),
      proximos: pendingDebts.filter((debt) => debt.dia >= today && debt.dia <= today + thresholdDays)
    };
  }

  globalScope.FinancialDebtUseCases = {
    markDebtPaid,
    buildDebtDueAlerts
  };
})(window);
