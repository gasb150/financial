(function(globalScope) {
  function getAppData(state = {}) {
    return state.appData && typeof state.appData === 'object' ? state.appData : {};
  }

  function getActiveMonthKey(state = {}) {
    return String(state.activeMonthKey || '').trim();
  }

  function getCurrentMonthDebts(state = {}) {
    const appData = getAppData(state);
    const activeMonthKey = getActiveMonthKey(state);
    const debts = Array.isArray(appData.compromisos) ? appData.compromisos : [];
    return debts.filter((debt) => debt && debt.mesKey === activeMonthKey);
  }

  function getTimelineMonths(state = {}) {
    const timeline = state.monthsTimeline;
    return Array.isArray(timeline) ? timeline.slice() : [];
  }

  function getAiPanelState(state = {}) {
    return state.aiPanelState && typeof state.aiPanelState === 'object' ? state.aiPanelState : {};
  }

  globalScope.FinancialSelectors = {
    getAppData,
    getActiveMonthKey,
    getCurrentMonthDebts,
    getTimelineMonths,
    getAiPanelState
  };
})(window);
