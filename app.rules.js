// Financial rules and calculations module extracted from app.js.

(function initFinancialRulesModule(globalScope) {
  function isValidMesKey(mesKey) {
    if(!mesKey || typeof mesKey !== 'string') return false;
    let parts = mesKey.split(' ');
    let mes = parts[0];
    let anioStr = parts[1];
    return ORDEN_MESES.includes(mes) && !isNaN(parseInt(anioStr, 10));
  }

  function parseMesKeySafe(mesKey) {
    let parts = mesKey.split(' ');
    let mes = parts[0];
    let anioStr = parts[1];
    return { mes, anio: parseInt(anioStr, 10) };
  }

  function mesKeyToNumericIndex(mesKey) {
    let parsed = parseMesKeySafe(mesKey);
    return (parsed.anio * 12) + ORDEN_MESES.indexOf(parsed.mes);
  }

  function numericIndexToMesKey(indexMes) {
    let anio = Math.floor(indexMes / 12);
    let mesIdx = ((indexMes % 12) + 12) % 12;
    return `${ORDEN_MESES[mesIdx]} ${anio}`;
  }

  function addMonthsToMesKey(mesKey, cantidad) {
    return numericIndexToMesKey(mesKeyToNumericIndex(mesKey) + cantidad);
  }

  function getIncomeStartMonth(ing) {
    return isValidMesKey(ing.mesInicio) ? ing.mesInicio : (mesesLineaTiempo[0] || mesActivoGlobal);
  }

  function getIncomeEndMonth(ing) {
    if(ing.mesFinIndefinido) return null;
    return isValidMesKey(ing.mesFin) ? ing.mesFin : null;
  }

  function isIncomeActiveInMonth(ing, mesKey) {
    let idxMes = mesKeyToNumericIndex(mesKey);
    let idxInicio = mesKeyToNumericIndex(getIncomeStartMonth(ing));
    if(idxMes < idxInicio) return false;
    let mesFin = getIncomeEndMonth(ing);
    if(!mesFin) return true;
    return idxMes <= mesKeyToNumericIndex(mesFin);
  }

  function ensureTimelineUntilMonth(mesKeyObjetivo) {
    if(!mesesLineaTiempo.length) return;
    let idxObjetivo = mesKeyToNumericIndex(mesKeyObjetivo);
    let idxUltimo = mesKeyToNumericIndex(mesesLineaTiempo[mesesLineaTiempo.length - 1]);

    while(idxUltimo < idxObjetivo) {
      idxUltimo += 1;
      mesesLineaTiempo.push(numericIndexToMesKey(idxUltimo));
    }
  }

  function previousMesKey(mesKey) {
    let parsed = parseMesKeySafe(mesKey);
    let idx = ORDEN_MESES.indexOf(parsed.mes);
    if(idx <= 0) return `${ORDEN_MESES[11]} ${parsed.anio - 1}`;
    return `${ORDEN_MESES[idx - 1]} ${parsed.anio}`;
  }

  function lastBusinessDayOfMonth(anio, mesIdx) {
    let d = new Date(anio, mesIdx + 1, 0);
    let dow = d.getDay();
    if(dow === 6) d.setDate(d.getDate() - 1);
    if(dow === 0) d.setDate(d.getDate() - 2);
    return d.getDate();
  }

  function nextFriday(fecha) {
    let d = new Date(fecha);
    let dow = d.getDay();
    let diff = (5 - dow + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function normalizeIncomeDayOfMonth(diaBase, anio, mesIdx, diasMes) {
    let dia = Math.min(Math.max(diaBase, 1), diasMes);
    if(dia >= 28) return lastBusinessDayOfMonth(anio, mesIdx);
    return dia;
  }

  function getIncomePaymentDaysInMonth(ing, mesKey) {
    let parsed = parseMesKeySafe(mesKey);
    let mesIdx = ORDEN_MESES.indexOf(parsed.mes);
    let diasMes = new Date(parsed.anio, mesIdx + 1, 0).getDate();

    if(ing.periodo !== 'biweekly') {
      let dia = normalizeIncomeDayOfMonth(getDiaIngreso(ing), parsed.anio, mesIdx, diasMes);
      return [dia];
    }

    if(!ing.anchorDate) {
      return [Math.min(getDiaIngreso(ing), diasMes)];
    }

    let anchor = new Date(`${ing.anchorDate}T00:00:00`);
    anchor = nextFriday(anchor);
    let inicioMes = new Date(parsed.anio, mesIdx, 1);
    let finMes = new Date(parsed.anio, mesIdx, diasMes);
    let dias = [];

    let cursor = new Date(anchor);
    while(cursor < inicioMes) {
      cursor.setDate(cursor.getDate() + 14);
    }
    while(cursor <= finMes) {
      if(cursor >= inicioMes) dias.push(cursor.getDate());
      cursor.setDate(cursor.getDate() + 14);
    }

    return dias;
  }

  function getMonthlyPaymentDayDetails(mesKey) {
    let parsed = parseMesKeySafe(mesKey);
    let mesIdx = ORDEN_MESES.indexOf(parsed.mes);
    let diasMes = new Date(parsed.anio, mesIdx + 1, 0).getDate();
    let out = {};

    function ensureDay(dia) {
      if(!out[dia]) out[dia] = { real: false, arrastre: false };
    }

    appData.ingresosList.forEach(i => {
      if(!isIncomeActiveInMonth(i, mesKey)) return;
      getIncomePaymentDaysInMonth(i, mesKey).forEach(d => {
        ensureDay(d);
        out[d].real = true;
      });
    });

    appData.primasList
      .filter(p => p.mesKey === mesKey)
      .forEach(p => {
        let dia = normalizeIncomeDayOfMonth(parseInt(p.diaPago, 10) || 1, parsed.anio, mesIdx, diasMes);
        ensureDay(dia);
        out[dia].real = true;
      });

    let mesPrevio = previousMesKey(mesKey);
    let prevData = parseMesKeySafe(mesPrevio);
    let prevMesIdx = ORDEN_MESES.indexOf(prevData.mes);
    let prevDiasMes = new Date(prevData.anio, prevMesIdx + 1, 0).getDate();

    appData.ingresosList.forEach(i => {
      if(!isIncomeActiveInMonth(i, mesPrevio)) return;
      let diasPrevios = getIncomePaymentDaysInMonth(i, mesPrevio);
      diasPrevios.forEach(d => {
        if(d >= 29) {
          ensureDay(1);
          out[1].arrastre = true;
        }
      });
    });

    appData.primasList
      .filter(p => p.mesKey === mesPrevio)
      .forEach(p => {
        let d = normalizeIncomeDayOfMonth(parseInt(p.diaPago, 10) || 1, prevData.anio, prevMesIdx, prevDiasMes);
        if(d >= 29) {
          ensureDay(1);
          out[1].arrastre = true;
        }
      });

    return out;
  }

  function getIncomeEventsForMonth(mesKey) {
    let eventos = [];
    appData.ingresosList.forEach(i => {
      if(!isIncomeActiveInMonth(i, mesKey)) return;
      let dias = getIncomePaymentDaysInMonth(i, mesKey);
      dias.forEach((dia, idx) => {
        if(dia <= 28) {
          eventos.push({
            id: `${i.id}-${mesKey}-${idx}`,
            nombre: i.nombre,
            valor: i.valor,
            dia: dia,
            origen: 'normal',
            fuenteTipo: 'ingreso',
            fuenteId: i.id
          });
        }
      });
    });

    let mesPrevio = previousMesKey(mesKey);
    appData.ingresosList.forEach(i => {
      if(!isIncomeActiveInMonth(i, mesPrevio)) return;
      let diasPrevios = getIncomePaymentDaysInMonth(i, mesPrevio);
      diasPrevios.forEach((dia, idx) => {
        if(dia >= 29) {
          eventos.push({
            id: `arrastre-${i.id}-${mesPrevio}-${idx}`,
            nombre: `${i.nombre} (arrastre mes anterior)`,
            valor: i.valor,
            dia: 1,
            origen: 'arrastre',
            fuenteTipo: 'ingreso',
            fuenteId: i.id
          });
        }
      });
    });

    appData.primasList.forEach(p => {
      let parsed = parseMesKeySafe(mesKey);
      let mesIdx = ORDEN_MESES.indexOf(parsed.mes);
      let diasMes = new Date(parsed.anio, mesIdx + 1, 0).getDate();
      let dia = normalizeIncomeDayOfMonth(parseInt(p.diaPago, 10) || 1, parsed.anio, mesIdx, diasMes);
      if(p.mesKey === mesKey && dia >= 1 && dia <= 28) {
        eventos.push({
          id: `prima-${p.id}`,
          nombre: p.nombre,
          valor: p.valor,
          dia: dia,
          origen: 'prima',
          fuenteTipo: 'prima',
          fuenteId: p.id
        });
      }
    });

    appData.primasList.forEach(p => {
      let mesPrevio = previousMesKey(mesKey);
      let parsed = parseMesKeySafe(mesPrevio);
      let mesIdx = ORDEN_MESES.indexOf(parsed.mes);
      let diasMes = new Date(parsed.anio, mesIdx + 1, 0).getDate();
      let dia = normalizeIncomeDayOfMonth(parseInt(p.diaPago, 10) || 1, parsed.anio, mesIdx, diasMes);
      if(p.mesKey === mesPrevio && dia >= 29 && dia <= 31) {
        eventos.push({
          id: `arrastre-prima-${p.id}`,
          nombre: `${p.nombre} (arrastre mes anterior)`,
          valor: p.valor,
          dia: 1,
          origen: 'prima-arrastre',
          fuenteTipo: 'prima',
          fuenteId: p.id
        });
      }
    });

    return eventos;
  }

  function calculateWeeklyBalance(compromisosMes, semana) {
    let ingresosEventos = getIncomeEventsForMonth(mesActivoGlobal);
    let ingresosSemana = ingresosEventos
      .filter(e => semana.dias.includes(e.dia))
      .reduce((acc, e) => acc + e.valor, 0);

    let gastosSemana = compromisosMes
      .filter(c => {
        let dVal = parseInt(c.dia, 10);
        if(dVal === -1 && semana.id === 'sem-1') return true;
        return semana.dias.includes(dVal);
      })
      .reduce((acc, c) => acc + c.valor, 0);

    return {
      ingresosSemana,
      gastosSemana,
      balanceSemana: ingresosSemana - gastosSemana,
      ingresosEventos
    };
  }

  function getWeeksForActiveMonth() {
    let partes = mesActivoGlobal.split(' ');
    let nombreMes = partes[0];
    let anio = parseInt(partes[1], 10);
    const mesesIndices = {
      'Enero':0,'Febrero':1,'Marzo':2,'Abril':3,'Mayo':4,'Junio':5,
      'Julio':6,'Agosto':7,'Septiembre':8,'Octubre':9,'Noviembre':10,'Diciembre':11
    };
    let mesIdx = mesesIndices[nombreMes];
    let totalDias = new Date(anio, mesIdx + 1, 0).getDate();
    let semanas = [];
    let diasAcumulados = [];
    let numSemanaFicticia = 1;

    for(let d = 1; d <= totalDias; d++) {
      diasAcumulados.push(d);
      let diaSemanaSistemas = new Date(anio, mesIdx, d).getDay();
      if(diaSemanaSistemas === 0 || d === totalDias) {
        semanas.push({
          id: `sem-${numSemanaFicticia}`,
          nombre: `Tramo Semanal ${numSemanaFicticia}`,
          rango: `${nombreMes.substring(0,3)} ${diasAcumulados[0]} - ${nombreMes.substring(0,3)} ${diasAcumulados[diasAcumulados.length - 1]}`,
          dias: [...diasAcumulados]
        });
        diasAcumulados = [];
        numSemanaFicticia++;
      }
    }
    return semanas;
  }

  globalScope.FinancialRules = {
    isValidMesKey,
    parseMesKeySafe,
    mesKeyToNumericIndex,
    numericIndexToMesKey,
    addMonthsToMesKey,
    getIncomeStartMonth,
    getIncomeEndMonth,
    isIncomeActiveInMonth,
    ensureTimelineUntilMonth,
    previousMesKey,
    lastBusinessDayOfMonth,
    nextFriday,
    normalizeIncomeDayOfMonth,
    getIncomePaymentDaysInMonth,
    getMonthlyPaymentDayDetails,
    getIncomeEventsForMonth,
    calculateWeeklyBalance,
    getWeeksForActiveMonth
  };
})(window);
