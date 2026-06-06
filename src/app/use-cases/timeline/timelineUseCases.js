(function(globalScope) {
  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function getMonthKeyForDate(date = new Date(), monthNames = MONTH_NAMES) {
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  function markBaseMonthCorrectionApplied(data) {
    if(!data || typeof data !== 'object') return data;
    if(!data.migraciones || typeof data.migraciones !== 'object') data.migraciones = {};
    data.migraciones.correccionMesBaseJunio2026 = true;
    return data;
  }

  function normalizeTimelineValue(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function compareMonthKeys(left, right, monthNames = MONTH_NAMES) {
    const leftParts = String(left || '').trim().split(/\s+/);
    const rightParts = String(right || '').trim().split(/\s+/);
    const leftMonthIndex = monthNames.indexOf(leftParts[0]);
    const rightMonthIndex = monthNames.indexOf(rightParts[0]);
    const leftYear = parseInt(leftParts[1], 10);
    const rightYear = parseInt(rightParts[1], 10);
    const leftValid = !Number.isNaN(leftYear) && leftMonthIndex >= 0;
    const rightValid = !Number.isNaN(rightYear) && rightMonthIndex >= 0;
    if(!leftValid || !rightValid) return leftValid === rightValid ? 0 : (leftValid ? -1 : 1);
    return (leftYear - rightYear) || (leftMonthIndex - rightMonthIndex);
  }

  function ensureCurrentYearTimelineMonths({ timeline, currentYear = new Date().getFullYear(), monthNames = MONTH_NAMES } = {}) {
    const currentYearMonths = monthNames.map((month) => `${month} ${currentYear}`);
    const normalizedExisting = Array.isArray(timeline)
      ? timeline.map(normalizeTimelineValue).filter(Boolean)
      : [];
    return Array.from(new Set([...currentYearMonths, ...normalizedExisting]))
      .sort((left, right) => compareMonthKeys(left, right, monthNames));
  }

  globalScope.FinancialTimelineUseCases = {
    MONTH_NAMES,
    getMonthKeyForDate,
    markBaseMonthCorrectionApplied,
    normalizeTimelineValue,
    compareMonthKeys,
    ensureCurrentYearTimelineMonths
  };
})(window);
