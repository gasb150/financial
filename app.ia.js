// IA module extracted from app.js for maintainability.

async function consultarIALocal(prompt) {
  let cfg = getConfigIALocal();
  let intentosTotales = cfg.retries + 1;
  let ultimoError = null;

  for(let intento = 1; intento <= intentosTotales; intento++) {
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      let resp = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.model,
          prompt,
          stream: false,
          options: { temperature: 0.2 }
        })
      });

      if(!resp.ok) {
        let detalleHttp = '';
        try {
          let body = await resp.json();
          if(body && body.error) detalleHttp = String(body.error);
        } catch(_e) {
          try {
            detalleHttp = (await resp.text() || '').trim();
          } catch(_e2) {}
        }

        if(resp.status === 404 && /model .* not found/i.test(detalleHttp)) {
          throw new Error(`${detalleHttp}. Ejecuta: ollama pull ${cfg.model}`);
        }

        throw new Error(detalleHttp ? `HTTP ${resp.status} en IA Local: ${detalleHttp}` : `HTTP ${resp.status} en IA Local`);
      }
      let data = await resp.json();
      let txt = String(data && data.response ? data.response : '').trim();
      if(!txt) throw new Error('IA Local no devolvio texto util.');

      clearTimeout(timeoutId);
      return { ok: true, mode: 'local', message: txt };
    } catch(err) {
      clearTimeout(timeoutId);
      ultimoError = err;
      if(intento < intentosTotales) continue;
    }
  }

  let detalle = '';
  if(ultimoError && ultimoError.name === 'AbortError') {
    detalle = `Tiempo de espera agotado en proveedor local (${cfg.timeoutMs} ms).`;
  } else if(ultimoError && ultimoError.name === 'TypeError') {
    detalle = `No se pudo conectar con IA LOCAL en ${cfg.endpoint}. Verifica que el servidor este arriba y accesible.\nSugerencia: si usas IA Local, inicia el servicio y prueba de nuevo.`;
  } else {
    detalle = ultimoError && ultimoError.message
      ? ultimoError.message
      : 'Error desconocido al consultar IA local.';
  }
  throw new Error(detalle);
}

function parsearRespuestaGatewayIA(data) {
  let payload = data && typeof data === 'object' ? data : {};
  let usage = payload.usage && typeof payload.usage === 'object' ? payload.usage : {};
  let message = '';
  if(typeof payload.message === 'string' && payload.message.trim()) {
    message = payload.message.trim();
  } else if(Array.isArray(payload.choices) && payload.choices[0]) {
    let c0 = payload.choices[0];
    if(c0.message && typeof c0.message.content === 'string') {
      message = c0.message.content.trim();
    } else if(typeof c0.text === 'string') {
      message = c0.text.trim();
    }
  } else if(typeof payload.response === 'string') {
    message = payload.response.trim();
  }
  return { message, usage };
}

async function consultarIAApiGateway(prompt) {
  let cfg = getConfigIAApi();
  if(!cfg.endpoint) {
    throw new Error('Configura el endpoint del gateway IA para usar modo API.');
  }
  validarLimitesIAAntesDeConsumir(cfg);

  let intentosTotales = cfg.retries + 1;
  let ultimoError = null;

  for(let intento = 1; intento <= intentosTotales; intento++) {
    let controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      let headers = { 'Content-Type': 'application/json' };
      if(cfg.apiKey) {
        headers.Authorization = `Bearer ${cfg.apiKey}`;
        headers['x-api-key'] = cfg.apiKey;
      }

      let resp = await fetch(cfg.endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          provider: cfg.provider,
          model: cfg.model,
          prompt,
          temperature: 0.2
        })
      });

      if(!resp.ok) {
        let detalleHttp = '';
        try {
          let body = await resp.json();
          detalleHttp = String(body && (body.error || body.message) ? (body.error || body.message) : '').trim();
        } catch(_e) {
          try {
            detalleHttp = (await resp.text() || '').trim();
          } catch(_e2) {}
        }
        throw new Error(detalleHttp ? `HTTP ${resp.status} en gateway IA: ${detalleHttp}` : `HTTP ${resp.status} en gateway IA`);
      }

      let data = await resp.json();
      let parsed = parsearRespuestaGatewayIA(data);
      if(!parsed.message) throw new Error('Gateway IA no devolvió texto util.');

      let usage = parsed.usage || {};
      let totalTokens = Math.max(
        0,
        parseInt(usage.totalTokens, 10)
        || parseInt(usage.total_tokens, 10)
        || (parseInt(usage.promptTokens, 10) || 0) + (parseInt(usage.completionTokens, 10) || 0)
      );
      if(totalTokens <= 0) {
        totalTokens = estimarTokensDesdeTexto(prompt) + estimarTokensDesdeTexto(parsed.message);
      }

      let costCop = Math.max(0, Math.round(parseMontoInput(usage.costCop)) || 0);
      if(costCop <= 0) {
        costCop = Math.max(1, Math.round((totalTokens / 1000) * cfg.limits.estimatedCopPer1kTokens));
      }

      registrarConsumoIAApi({ tokens: totalTokens, costCop }, cfg);
      clearTimeout(timeoutId);
      return { ok: true, mode: 'api', provider: cfg.provider, message: parsed.message, usage: { totalTokens, costCop } };
    } catch(err) {
      clearTimeout(timeoutId);
      ultimoError = err;
      if(intento < intentosTotales) continue;
    }
  }

  if(ultimoError && ultimoError.name === 'AbortError') {
    throw new Error(`Tiempo de espera agotado en gateway IA (${cfg.timeoutMs} ms).`);
  }
  if(ultimoError && ultimoError.name === 'TypeError') {
    throw new Error(`No se pudo conectar al gateway IA en ${cfg.endpoint}.`);
  }
  throw new Error(ultimoError && ultimoError.message ? ultimoError.message : 'Error desconocido al consultar gateway IA.');
}

async function ejecutarConsultaIA(prompt) {
  let modo = getModoIA();
  if(modo === 'off') {
    throw new Error('Modo IA en OFF. Activa LOCAL o API para usar funciones IA.');
  }
  if(modo === 'local') {
    return consultarIALocal(prompt);
  }
  return consultarIAApiGateway(prompt);
}

window.FinancialIA = {
  queryLocalAI: consultarIALocal,
  parseAIGatewayResponse: parsearRespuestaGatewayIA,
  queryApiAI: consultarIAApiGateway,
  executeAIQuery: ejecutarConsultaIA
};

function construirPromptEstrategiaDeudas(items) {
  let total = items.reduce((acc, it) => acc + it.valor, 0);
  let lista = items.map((it, idx) => `${idx + 1}. ${it.nombre} - ${formatCOP(it.valor)} (dia ${it.dia === -1 ? 'pre-mes' : it.dia})`).join('\n');
  return [
    'Actua como asesor financiero personal y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Total de deudas personales en muestra: ${formatCOP(total)}.`,
    'Lista de deudas:',
    lista,
    'Entrega una estrategia de pago en maximo 6 pasos concretos, priorizando impacto y urgencia.',
    'Formato de salida: bullets cortos y accionables.'
  ].join('\n');
}

function construirPromptRecorteVariables(items) {
  let total = items.reduce((acc, it) => acc + it.valor, 0);
  let lista = items.map((it, idx) => `${idx + 1}. ${it.nombre} - ${formatCOP(it.valor)} (dia ${it.dia === -1 ? 'pre-mes' : it.dia})`).join('\n');
  return [
    'Actua como analista de presupuesto familiar y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Total de gastos variables en muestra: ${formatCOP(total)}.`,
    'Lista de gastos variables:',
    lista,
    'Entrega recomendaciones para recortar gastos sin afectar obligaciones criticas.',
    'Incluye 5 acciones con ahorro estimado y prioridad alta/media/baja.'
  ].join('\n');
}

function getEstadoRecortesItemsMes() {
  if(!iaPanelState.recortesItemsMes || typeof iaPanelState.recortesItemsMes !== 'object') {
    iaPanelState.recortesItemsMes = { loading: false, error: '', result: '', items: [] };
  }
  if(!Array.isArray(iaPanelState.recortesItemsMes.items)) iaPanelState.recortesItemsMes.items = [];
  return iaPanelState.recortesItemsMes;
}

function obtenerEtiquetaTramoPorDia(diaRaw) {
  let dia = parseInt(diaRaw, 10);
  if(dia === -1) return 'PRE';
  if(dia >= 1 && dia <= 14) return 'Q1';
  return 'Q2';
}

function construirPromptRecortesItemAccionables(items) {
  let total = items.reduce((acc, it) => acc + it.valor, 0);
  let lista = items
    .map((it) => {
      return `id=${it.id} | nombre=${it.nombre} | valor=${Math.round(it.valor)} | dia=${it.dia === -1 ? 'pre-mes' : it.dia} | tramo=${obtenerEtiquetaTramoPorDia(it.dia)}`;
    })
    .join('\n');

  return [
    'Actua como analista financiero y responde estrictamente en JSON valido.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Total gastos variables pendientes en muestra: ${Math.round(total)} COP.`,
    'Objetivo: proponer recortes item a item accionables.',
    'Reglas:',
    '- Solo usa IDs de la lista entregada.',
    '- accion debe ser uno de: reducir, posponer, mover_tramo.',
    '- riesgo debe ser uno de: alto, medio, bajo.',
    '- ahorroEstimado debe ser numero entero >= 0.',
    '- Si accion=reducir incluye nuevoValor (>0 y < valor actual).',
    '- Si accion=posponer incluye diaSugerido (1-31 o -1).',
    '- Si accion=mover_tramo incluye tramoDestino (PRE, Q1 o Q2).',
    'Devuelve exactamente este objeto JSON (sin markdown):',
    '{"sugerencias":[{"itemId":0,"accion":"reducir","ahorroEstimado":0,"riesgo":"medio","prioridad":"alta","nuevoValor":0,"diaSugerido":null,"tramoDestino":null,"motivo":"texto corto"}]}',
    'Lista de items:',
    lista
  ].join('\n');
}

function extraerJSONDeTextoIA(texto) {
  let bruto = String(texto || '').trim();
  if(!bruto) return null;
  let limpio = bruto.replace(/```json/gi, '').replace(/```/g, '').trim();

  try { return JSON.parse(limpio); } catch(_e) {}

  let iniArr = limpio.indexOf('[');
  let finArr = limpio.lastIndexOf(']');
  if(iniArr >= 0 && finArr > iniArr) {
    let candidatoArr = limpio.slice(iniArr, finArr + 1);
    try { return JSON.parse(candidatoArr); } catch(_e) {}
  }

  let iniObj = limpio.indexOf('{');
  let finObj = limpio.lastIndexOf('}');
  if(iniObj >= 0 && finObj > iniObj) {
    let candidatoObj = limpio.slice(iniObj, finObj + 1);
    try { return JSON.parse(candidatoObj); } catch(_e) {}
  }

  return null;
}

function normalizarAccionRecorte(accionRaw) {
  let txt = String(accionRaw || '').toLowerCase();
  if(txt.includes('pospon')) return 'posponer';
  if(txt.includes('mover') || txt.includes('tramo')) return 'mover_tramo';
  return 'reducir';
}

function normalizarRiesgoRecorte(riesgoRaw) {
  let txt = String(riesgoRaw || '').toLowerCase();
  if(txt.includes('alto')) return 'alto';
  if(txt.includes('bajo')) return 'bajo';
  return 'medio';
}

function normalizarPrioridadRecorte(prioridadRaw) {
  let txt = String(prioridadRaw || '').toLowerCase();
  if(txt.includes('alta')) return 'alta';
  if(txt.includes('baja')) return 'baja';
  return 'media';
}

function normalizarTramoDestinoRecorte(tramoRaw) {
  let txt = String(tramoRaw || '').toLowerCase().trim();
  if(!txt) return null;
  if(txt.includes('pre')) return 'pre';
  if(txt.includes('q1') || txt.includes('1')) return 'q1';
  if(txt.includes('q2') || txt.includes('2')) return 'q2';
  return null;
}

function normalizarAccionIAUnificada(raw, ctx = {}) {
  if(!raw || typeof raw !== 'object') return null;

  let source = String(ctx.source || raw.source || 'recorte').toLowerCase();
  let allowedItemIds = Array.isArray(ctx.allowedItemIds) ? new Set(ctx.allowedItemIds) : null;
  let itemId = parseInt(raw.itemId, 10);
  if(isNaN(itemId)) return null;
  if(allowedItemIds && !allowedItemIds.has(itemId)) return null;

  let accion = normalizarAccionRecorte(raw.accion);
  if(!IA_ACTION_TYPES.includes(accion)) return null;

  let ahorroEstimado = Math.max(0, Math.round(parseMontoInput(raw.ahorroEstimado)) || 0);
  let nuevoValorRaw = Math.round(parseMontoInput(raw.nuevoValor));
  let nuevoValor = Number.isFinite(nuevoValorRaw) ? nuevoValorRaw : null;

  let diaSugerido = null;
  if(raw.diaSugerido !== undefined && raw.diaSugerido !== null && raw.diaSugerido !== '') {
    let d = parseInt(raw.diaSugerido, 10);
    if(!isNaN(d) && (d === -1 || (d >= 1 && d <= 31))) diaSugerido = d;
  }

  let tramoDestino = normalizarTramoDestinoRecorte(raw.tramoDestino);
  let riesgo = normalizarRiesgoRecorte(raw.riesgo);
  let prioridad = normalizarPrioridadRecorte(raw.prioridad);

  return {
    schemaVersion: IA_ACTION_SCHEMA_VERSION,
    source,
    itemId,
    accion,
    ahorroEstimado,
    riesgo,
    prioridad,
    nuevoValor: accion === 'reducir' ? nuevoValor : null,
    diaSugerido: accion === 'posponer' ? diaSugerido : null,
    tramoDestino: accion === 'mover_tramo' ? tramoDestino : null,
    motivo: String(raw.motivo || 'Sin motivo detallado.').trim(),
    applied: !!raw.applied
  };
}

function generarSugerenciasFallbackRecorte(items) {
  return items.slice(0, 4).map((it, idx) => {
    if(idx === 2) {
      return {
        itemId: it.id,
        nombre: it.nombre,
        accion: 'mover_tramo',
        ahorroEstimado: 0,
        riesgo: 'medio',
        prioridad: 'media',
        nuevoValor: null,
        diaSugerido: null,
        tramoDestino: it.dia === -1 || parseInt(it.dia, 10) <= 14 ? 'q2' : 'q1',
        motivo: 'Mejora la distribucion del flujo entre tramos.',
        applied: false
      };
    }

    if(idx === 3) {
      return {
        itemId: it.id,
        nombre: it.nombre,
        accion: 'posponer',
        ahorroEstimado: 0,
        riesgo: 'medio',
        prioridad: 'media',
        nuevoValor: null,
        diaSugerido: parseInt(it.dia, 10) <= 14 ? 20 : 28,
        tramoDestino: null,
        motivo: 'Posponer reduce presion de caja en el tramo actual.',
        applied: false
      };
    }

    let nuevoValor = Math.max(1000, Math.round(it.valor * 0.85));
    return {
      itemId: it.id,
      nombre: it.nombre,
      accion: 'reducir',
      ahorroEstimado: Math.max(0, Math.round(it.valor - nuevoValor)),
      riesgo: idx === 0 ? 'medio' : 'bajo',
      prioridad: idx === 0 ? 'alta' : 'media',
      nuevoValor,
      diaSugerido: null,
      tramoDestino: null,
      motivo: 'Recorte progresivo para liberar flujo sin eliminar el item.',
      applied: false
    };
  });
}

function normalizarSugerenciasRecorteDesdeIA(rawParsed, itemsBase) {
  let lista = [];
  if(Array.isArray(rawParsed)) lista = rawParsed;
  else if(rawParsed && Array.isArray(rawParsed.sugerencias)) lista = rawParsed.sugerencias;

  let byId = new Map(itemsBase.map(it => [it.id, it]));
  let byNombre = new Map(itemsBase.map(it => [String(it.nombre || '').trim().toLowerCase(), it]));

  let out = [];
  lista.forEach((s) => {
    if(!s || typeof s !== 'object') return;
    let idNum = parseInt(s.itemId, 10);
    let item = byId.get(idNum);
    if(!item && s.nombre) {
      item = byNombre.get(String(s.nombre).trim().toLowerCase());
    }
    if(!item) return;

    let baseRaw = {
      source: 'recorte',
      itemId: item.id,
      accion: s.accion,
      ahorroEstimado: s.ahorroEstimado,
      riesgo: s.riesgo,
      prioridad: s.prioridad,
      nuevoValor: s.nuevoValor,
      diaSugerido: s.diaSugerido,
      tramoDestino: s.tramoDestino,
      motivo: s.motivo,
      applied: false
    };

    let normalizada = normalizarAccionIAUnificada(baseRaw, { source: 'recorte', allowedItemIds: itemsBase.map(it => it.id) });
    if(!normalizada) return;

    if(normalizada.accion === 'reducir') {
      let nuevoValor = normalizada.nuevoValor;
      if(!nuevoValor || nuevoValor <= 0 || nuevoValor >= item.valor) {
        nuevoValor = Math.max(1000, Math.round(item.valor * 0.85));
      }
      normalizada.nuevoValor = nuevoValor;
      normalizada.ahorroEstimado = Math.max(normalizada.ahorroEstimado, Math.round(item.valor - nuevoValor));
    }

    out.push({ ...normalizada, nombre: item.nombre });
  });

  let ids = new Set();
  return out.filter((s) => {
    let key = `${s.itemId}-${s.accion}`;
    if(ids.has(key)) return false;
    ids.add(key);
    return true;
  }).slice(0, 6);
}

function resolverDiaPospuesto(diaActual) {
  let d = parseInt(diaActual, 10);
  if(d === -1) return 15;
  if(d >= 1 && d <= 14) return 20;
  if(d >= 15 && d <= 24) return 28;
  return Math.min(Math.max(d + 3, 1), 31);
}

function resolverDiaTramoDestinoMes(tramoDestino) {
  if(tramoDestino === 'pre') return -1;
  if(tramoDestino === 'q1') return 10;
  if(tramoDestino === 'q2') return 20;
  return null;
}

function construirPreviewAccionIA(accion, compromisosMes) {
  if(!accion || typeof accion !== 'object') return null;
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let idx = base.findIndex(c => c.id === accion.itemId);
  if(idx < 0) return null;

  let original = base[idx];
  let antesPendienteMes = base.reduce((acc, c) => acc + (!c.pagado ? c.valor : 0), 0);
  let tramosAntes = obtenerResumenTramosQuincena(base);
  let tramoAntesId = obtenerTramoCompromiso('quincena', original, tramosAntes);

  let clon = base.map(c => ({ ...c }));
  let objetivo = clon[idx];

  if(accion.accion === 'reducir') {
    let actual = Math.round(objetivo.valor);
    let nuevo = Math.round(accion.nuevoValor || Math.max(1000, Math.round(actual * 0.85)));
    nuevo = Math.max(1, Math.min(nuevo, actual - 1));
    objetivo.valor = nuevo;
  } else if(accion.accion === 'posponer') {
    let dia = accion.diaSugerido;
    if(dia === null || isNaN(parseInt(dia, 10))) dia = resolverDiaPospuesto(objetivo.dia);
    objetivo.dia = dia;
  } else if(accion.accion === 'mover_tramo') {
    let diaDestino = resolverDiaTramoDestinoMes(accion.tramoDestino);
    if(diaDestino === null) diaDestino = parseInt(objetivo.dia, 10) <= 14 ? 20 : 10;
    objetivo.dia = diaDestino;
  }

  let despuesPendienteMes = clon.reduce((acc, c) => acc + (!c.pagado ? c.valor : 0), 0);
  let tramosDespues = obtenerResumenTramosQuincena(clon);
  let tramoDespuesId = obtenerTramoCompromiso('quincena', objetivo, tramosDespues);

  let tramoAntesObj = tramosAntes.find(t => t.id === tramoAntesId) || null;
  let tramoDespuesObj = tramosDespues.find(t => t.id === tramoDespuesId) || null;

  return {
    pendienteMesAntes: antesPendienteMes,
    pendienteMesDespues: despuesPendienteMes,
    ahorroMes: Math.max(0, Math.round(antesPendienteMes - despuesPendienteMes)),
    tramoAntes: tramoAntesObj ? { id: tramoAntesObj.id, codigo: tramoAntesObj.codigo, saldo: tramoAntesObj.saldoCierre } : null,
    tramoDespues: tramoDespuesObj ? { id: tramoDespuesObj.id, codigo: tramoDespuesObj.codigo, saldo: tramoDespuesObj.saldoCierre } : null
  };
}

function construirTextoPreviewAccionIA(preview) {
  if(!preview) return 'Preview no disponible.';
  let tramoTxt = '';
  if(preview.tramoAntes && preview.tramoDespues) {
    if(preview.tramoAntes.id === preview.tramoDespues.id) {
      tramoTxt = ` · ${preview.tramoAntes.codigo}: ${formatCOP(preview.tramoAntes.saldo)} -> ${formatCOP(preview.tramoDespues.saldo)}`;
    } else {
      tramoTxt = ` · ${preview.tramoAntes.codigo}/${preview.tramoDespues.codigo}: ${formatCOP(preview.tramoAntes.saldo)} -> ${formatCOP(preview.tramoDespues.saldo)}`;
    }
  }
  return `Mes pendiente: ${formatCOP(preview.pendienteMesAntes)} -> ${formatCOP(preview.pendienteMesDespues)}${tramoTxt}`;
}

function construirTextoConfirmacionAccionIA(accion, nombre, preview) {
  let cab = `${etiquetaAccionRecorte(accion.accion)}: ${nombre}`;
  let detalle = construirTextoPreviewAccionIA(preview);
  let motivo = accion.motivo ? `\nMotivo: ${accion.motivo}` : '';
  return `${cab}\n${detalle}${motivo}\n\n¿Aplicar cambio?`;
}

function asegurarHistorialIA() {
  if(!appData.iaHistory || typeof appData.iaHistory !== 'object') {
    appData.iaHistory = { version: 1, lastEventAt: null, events: [] };
  }
  if(!Array.isArray(appData.iaHistory.events)) appData.iaHistory.events = [];
  if(typeof appData.iaHistory.version !== 'number' || appData.iaHistory.version < 1) appData.iaHistory.version = 1;
  if(typeof appData.iaHistory.lastEventAt !== 'string') appData.iaHistory.lastEventAt = null;
  return appData.iaHistory;
}

function clonarCompromisoHistorial(comp) {
  if(!comp || typeof comp !== 'object') return null;
  let out = {
    id: comp.id,
    nombre: comp.nombre,
    valor: comp.valor,
    dia: comp.dia,
    diaPagoReal: comp.diaPagoReal === undefined ? null : comp.diaPagoReal,
    pagado: !!comp.pagado,
    tipo: comp.tipo,
    mesKey: comp.mesKey
  };
  if(comp.tipo === 'credito') {
    out.faltantes = comp.faltantes;
    out.totales = comp.totales;
  }
  return out;
}

function registrarEventoHistorialIA(payload) {
  let history = asegurarHistorialIA();
  let now = new Date().toISOString();
  let before = clonarCompromisoHistorial(payload.before);
  let after = clonarCompromisoHistorial(payload.after);
  if(!before || !after) return null;

  let evento = {
    id: `ia-event-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    source: String(payload.source || 'desconocido').toLowerCase(),
    action: String(payload.action || 'desconocida').toLowerCase(),
    itemId: after.id,
    itemName: String(after.nombre || payload.itemName || '').trim(),
    monthKey: String(payload.monthKey || after.mesKey || mesActivoGlobal),
    appliedAt: now,
    revertedAt: null,
    reason: String(payload.reason || '').trim(),
    before,
    after,
    meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
  };

  history.events.push(evento);
  if(history.events.length > 120) history.events = history.events.slice(-120);
  history.lastEventAt = now;

  return evento;
}

function obtenerEventoHistorialIA(eventId) {
  let history = asegurarHistorialIA();
  return history.events.find((evt) => evt.id === eventId) || null;
}

function actualizarEstadoAplicadoDesdeHistorialIA() {
  let history = asegurarHistorialIA();
  let activos = new Set(history.events.filter((evt) => !evt.revertedAt).map((evt) => evt.id));

  let recortes = getEstadoRecortesItemsMes();
  if(Array.isArray(recortes.items)) {
    recortes.items.forEach((s) => {
      if(!s || !s.historyEventId) return;
      if(!activos.has(s.historyEventId)) {
        s.applied = false;
        delete s.appliedAt;
        delete s.undoPayload;
        delete s.ahorroReal;
      }
    });
  }

  ['rebalanceQuincena', 'rebalanceSemana'].forEach((stateKey) => {
    let st = iaPanelState[stateKey];
    if(!st || !Array.isArray(st.actions)) return;
    st.actions.forEach((a) => {
      if(!a || !a.historyEventId) return;
      if(!activos.has(a.historyEventId)) {
        a.applied = false;
        delete a.appliedAt;
        delete a.undoPayload;
      }
    });
  });
}

function revertirEventoHistorialIA(eventId, options = {}) {
  let evento = obtenerEventoHistorialIA(eventId);
  if(!evento) return { ok: false, error: 'Evento IA no encontrado.' };
  if(evento.revertedAt) return { ok: false, error: 'Este evento ya fue revertido.' };
  if(!evento.before || !evento.before.id || !evento.before.mesKey) {
    return { ok: false, error: 'El evento no tiene snapshot previo para revertir.' };
  }

  let idxComp = appData.compromisos.findIndex((c) => c.id === evento.before.id && c.mesKey === evento.before.mesKey);
  if(idxComp < 0) {
    return { ok: false, error: 'No se puede revertir: el compromiso ya no existe.' };
  }

  appData.compromisos[idxComp] = { ...evento.before };
  evento.revertedAt = new Date().toISOString();
  evento.meta = evento.meta && typeof evento.meta === 'object' ? evento.meta : {};
  if(options.reason) evento.meta.revertReason = String(options.reason);

  asegurarHistorialIA().lastEventAt = evento.revertedAt;
  actualizarEstadoAplicadoDesdeHistorialIA();

  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(evento.revertedAt);

  if(!options.silent) {
    let recortes = getEstadoRecortesItemsMes();
    recortes.error = '';
    recortes.result = `Evento revertido: ${evento.itemName}.`;
    initApp();
  }

  return { ok: true, event: evento };
}

function revertirUltimosEventosIA(cantidad = 3) {
  let history = asegurarHistorialIA();
  let limite = Math.max(1, Math.min(10, parseInt(cantidad, 10) || 3));
  let candidatos = history.events
    .filter((evt) => evt && !evt.revertedAt)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, limite);

  if(!candidatos.length) {
    let recortes = getEstadoRecortesItemsMes();
    recortes.error = '1';
    recortes.result = 'No hay eventos IA activos para revertir.';
    initApp();
    return;
  }

  let ok = 0;
  let fail = 0;
  candidatos.forEach((evt) => {
    let out = revertirEventoHistorialIA(evt.id, { silent: true, reason: 'bulk' });
    if(out.ok) ok += 1;
    else fail += 1;
  });

  let recortes = getEstadoRecortesItemsMes();
  recortes.error = fail > 0 ? '1' : '';
  recortes.result = `Reversion masiva completada. Exitos: ${ok}. Fallos: ${fail}.`;
  initApp();
}

function deshacerCambioSugerenciaRecorteMesIA(index) {
  let stateKey = 'recortesItemsMes';
  let st = getEstadoRecortesItemsMes();
  let sugerencias = Array.isArray(st.items) ? st.items : [];
  let sug = sugerencias[index];

  if(!sug || !sug.applied || !sug.undoPayload || !sug.undoPayload.prevComp) {
    st.error = '1';
    st.result = 'No hay un cambio aplicado para deshacer en esta sugerencia.';
    renderIAPanelResumen();
    return;
  }

  let prev = sug.undoPayload.prevComp;
  let idxComp = appData.compromisos.findIndex(c => c.id === prev.id && c.mesKey === prev.mesKey);
  if(idxComp < 0) {
    st.error = '1';
    st.result = `No se pudo deshacer: el item ${sug.nombre} ya no existe en el mes activo.`;
    renderIAPanelResumen();
    return;
  }

  appData.compromisos[idxComp] = { ...prev };
  if(sug.historyEventId) {
    let evt = obtenerEventoHistorialIA(sug.historyEventId);
    if(evt && !evt.revertedAt) evt.revertedAt = new Date().toISOString();
  }
  sug.applied = false;
  delete sug.appliedAt;
  delete sug.ahorroReal;
  delete sug.undoPayload;
  delete sug.historyEventId;

  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());

  st.error = '';
  st.result = `Cambio deshecho para: ${sug.nombre}.`;
  initApp();
}

function etiquetaAccionRecorte(accion) {
  if(accion === 'mover_tramo') return 'Mover tramo';
  if(accion === 'posponer') return 'Posponer';
  return 'Reducir monto';
}

function renderSugerenciasRecorteAccionables(stateKey) {
  let estado = iaPanelState[stateKey];
  let items = Array.isArray(estado.items) ? estado.items : [];
  if(!items.length) return '<div class="ia-row"><div class="meta">Sin sugerencias item a item todavía.</div></div>';

  return items.map((s, idx) => {
    let preview = construirPreviewAccionIA(s, getCompromisosMesActual());
    let ahorroTxt = s.ahorroEstimado > 0 ? `Ahorro est.: ${formatCOP(s.ahorroEstimado)}` : 'Ahorro est.: impacto en flujo';
    let metaAccion = '';
    if(s.accion === 'reducir' && s.nuevoValor) metaAccion = `Nuevo valor: ${formatCOP(s.nuevoValor)}`;
    if(s.accion === 'posponer' && s.diaSugerido !== null) metaAccion = `Mover al día ${s.diaSugerido === -1 ? 'pre-mes' : s.diaSugerido}`;
    if(s.accion === 'mover_tramo' && s.tramoDestino) metaAccion = `Mover a ${String(s.tramoDestino).toUpperCase()}`;
    return `
      <div class="ia-row" style="display:block;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div>
            <div class="nm">${escapeHTML(s.nombre)}</div>
            <div class="meta">${etiquetaAccionRecorte(s.accion)} · Riesgo ${escapeHTML(s.riesgo)} · Prioridad ${escapeHTML(s.prioridad)}</div>
            <div class="meta">${escapeHTML(metaAccion)} · ${ahorroTxt}</div>
            <div class="meta">${escapeHTML(construirTextoPreviewAccionIA(preview))}</div>
            <div class="meta" style="margin-top:2px;">${escapeHTML(s.motivo || '')}</div>
          </div>
          ${s.applied
            ? `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="deshacerCambioSugerenciaRecorteMesIA(${idx})">Deshacer cambio</button>`
            : `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="aplicarSugerenciaRecorteMesIA(${idx})">Aplicar</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function buildIACardRecortesItemsMes(items, stateKey, actionFnName) {
  let estado = iaPanelState[stateKey];
  let sugerencias = Array.isArray(estado.items) ? estado.items : [];
  let ahorroTotal = sugerencias.reduce((acc, s) => acc + (s.ahorroEstimado || 0), 0);
  let aplicadas = sugerencias.filter(s => s.applied).length;
  let totalPendientes = items.reduce((acc, it) => acc + it.valor, 0);
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';

  return `
    <div class="ia-card">
      <div class="ttl">Recortes item a item</div>
      <div class="ia-row">
        <div>
          <div class="nm">Pendiente variables del mes</div>
          <div class="meta">${items.length} items · ahorro proyectado ${formatCOP(ahorroTotal)}</div>
        </div>
        <div class="vl">${formatCOP(totalPendientes)}</div>
      </div>
      ${renderSugerenciasRecorteAccionables(stateKey)}
      <div class="meta" style="margin-top:8px;">Aplicadas: ${aplicadas}/${sugerencias.length}</div>
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : 'Generar recortes accionables ↗'}</button>
      ${resultado}
    </div>
  `;
}

function renderFilasHistorialIA() {
  let history = asegurarHistorialIA();
  let items = history.events
    .slice()
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    .slice(0, 8);

  if(!items.length) {
    return '<div class="ia-row"><div class="meta">Sin eventos IA aplicados todavía.</div></div>';
  }

  return items.map((evt) => {
    let fecha = evt.appliedAt ? new Date(evt.appliedAt).toLocaleString('es-CO') : 'N/D';
    let estado = evt.revertedAt ? 'Revertido' : 'Activo';
    let beforeTxt = evt.before ? `${formatCOP(evt.before.valor)} · día ${evt.before.dia === -1 ? 'pre-mes' : evt.before.dia}` : 'N/D';
    let afterTxt = evt.after ? `${formatCOP(evt.after.valor)} · día ${evt.after.dia === -1 ? 'pre-mes' : evt.after.dia}` : 'N/D';
    return `
      <div class="ia-row" style="display:block;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div>
            <div class="nm">${escapeHTML(evt.itemName || `Item ${evt.itemId}`)}</div>
            <div class="meta">${escapeHTML(String(evt.source || 'ia'))} · ${escapeHTML(String(evt.action || 'accion'))} · ${escapeHTML(estado)}</div>
            <div class="meta">${escapeHTML(fecha)} · ${escapeHTML(beforeTxt)} → ${escapeHTML(afterTxt)}</div>
          </div>
          ${evt.revertedAt
            ? '<span class="meta">OK</span>'
            : `<button class="ia-cta" style="width:auto;min-width:110px;padding:7px 10px;margin-top:0;" onclick="revertirEventoHistorialIA('${evt.id}')">Revertir</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function buildIACardHistorialIA() {
  let history = asegurarHistorialIA();
  let activos = history.events.filter((evt) => !evt.revertedAt).length;
  let total = history.events.length;

  return `
    <div class="ia-card">
      <div class="ttl">Historial IA aplicado</div>
      <div class="ia-row">
        <div>
          <div class="nm">Eventos registrados</div>
          <div class="meta">Activos ${activos} · Total ${total}</div>
        </div>
      </div>
      ${renderFilasHistorialIA()}
      <button class="ia-cta" onclick="revertirUltimosEventosIA(3)" ${activos === 0 ? 'disabled' : ''}>Revertir últimos 3 ↩</button>
    </div>
  `;
}

function obtenerResumenTramosSemanales(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let semanas = obtenerSemanasDelMesActivo();
  let saldoArrastre = 0;

  return semanas.map((semana) => {
    let stats = calcularBalanceSemanal(base, semana);
    let saldoInicial = saldoArrastre;
    let saldoCierre = saldoInicial + stats.balanceSemana;
    saldoArrastre = saldoCierre;
    return {
      id: semana.id,
      codigo: semana.id.replace('sem-', 'S'),
      nombre: semana.nombre,
      rango: semana.rango,
      dias: [...semana.dias],
      ingresos: stats.ingresosSemana,
      gastos: stats.gastosSemana,
      saldoInicial,
      saldoCierre
    };
  });
}

function obtenerResumenTramosQuincena(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let eventosIngresosMes = obtenerEventosIngresoDelMes(mesActivoGlobal);

  let ingQ1 = eventosIngresosMes
    .filter(e => e.dia >= 1 && e.dia <= 14)
    .reduce((acc, e) => acc + e.valor, 0);
  let ingQ2 = eventosIngresosMes
    .filter(e => e.dia >= 15)
    .reduce((acc, e) => acc + e.valor, 0);

  let tramos = [
    {
      id: 'pre',
      codigo: 'PRE',
      nombre: 'Pre-Mes',
      dias: [-1],
      ingresos: 0,
      gastos: base.filter(c => parseInt(c.dia, 10) === -1).reduce((acc, c) => acc + c.valor, 0)
    },
    {
      id: 'q1',
      codigo: 'Q1',
      nombre: 'Quincena 1',
      dias: Array.from({ length: 14 }, (_, i) => i + 1),
      ingresos: ingQ1,
      gastos: base.filter(c => {
        let d = parseInt(c.dia, 10);
        return d >= 1 && d <= 14;
      }).reduce((acc, c) => acc + c.valor, 0)
    },
    {
      id: 'q2',
      codigo: 'Q2',
      nombre: 'Quincena 2',
      dias: Array.from({ length: 17 }, (_, i) => i + 15),
      ingresos: ingQ2,
      gastos: base.filter(c => parseInt(c.dia, 10) >= 15).reduce((acc, c) => acc + c.valor, 0)
    }
  ];

  let saldoArrastre = 0;
  return tramos.map((t) => {
    let saldoInicial = saldoArrastre;
    let saldoCierre = saldoInicial + t.ingresos - t.gastos;
    saldoArrastre = saldoCierre;
    return { ...t, saldoInicial, saldoCierre };
  });
}

function obtenerResumenTramos(scope, compromisosMes) {
  if(scope === 'semana') return obtenerResumenTramosSemanales(compromisosMes);
  return obtenerResumenTramosQuincena(compromisosMes);
}

function obtenerTramoCompromiso(scope, comp, tramos) {
  let dia = parseInt(comp.dia, 10);
  let listaTramos = Array.isArray(tramos) && tramos.length ? tramos : obtenerResumenTramos(scope);

  if(scope === 'semana') {
    if(dia === -1) return listaTramos[0] ? listaTramos[0].id : null;
    let tramo = listaTramos.find(t => Array.isArray(t.dias) && t.dias.includes(dia));
    return tramo ? tramo.id : null;
  }

  if(dia === -1) return 'pre';
  if(dia >= 1 && dia <= 14) return 'q1';
  return 'q2';
}

function obtenerDiaRepresentativoTramo(scope, tramoId, tramos) {
  if(scope === 'quincena') {
    if(tramoId === 'pre') return -1;
    if(tramoId === 'q1') return 10;
    return 20;
  }

  let listaTramos = Array.isArray(tramos) && tramos.length ? tramos : obtenerResumenTramosSemanales(getCompromisosMesActual());
  let tramo = listaTramos.find(t => t.id === tramoId);
  if(!tramo || !Array.isArray(tramo.dias) || !tramo.dias.length) return 1;
  return tramo.dias[0];
}

function obtenerCompromisosMovibles(scope, tramos, compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  return base
    .filter(c => !c.pagado && c.tipo === 'variable')
    .map(c => {
      let tramoId = obtenerTramoCompromiso(scope, c, tramos);
      return {
        id: c.id,
        nombre: c.nombre,
        valor: c.valor,
        dia: c.dia,
        tipo: c.tipo,
        tramoId
      };
    })
    .filter(c => !!c.tramoId)
    .sort((a, b) => b.valor - a.valor);
}

function construirPromptRebalanceoTramos(scope, tramos, movibles) {
  let nombreScope = scope === 'semana' ? 'tramos semanales' : 'tramos de quincena';
  let resumen = tramos.map(t => {
    return `${t.codigo} | ingresos ${formatCOP(t.ingresos)} | gastos ${formatCOP(t.gastos)} | saldo cierre ${formatCOP(t.saldoCierre)}`;
  }).join('\n');
  let moviblesTxt = movibles.length
    ? movibles.slice(0, 15).map((m, idx) => `${idx + 1}. ${m.nombre} - ${formatCOP(m.valor)} - tramo actual ${String(m.tramoId).toUpperCase()} - dia ${m.dia === -1 ? 'pre-mes' : m.dia}`).join('\n')
    : 'Sin compromisos variables movibles en este mes.';

  return [
    'Actua como estratega financiero y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Objetivo: rebalancear ${nombreScope} moviendo obligaciones no criticas desde tramos deficitarios a tramos con capacidad.`,
    'Restricciones obligatorias:',
    '- No mover gastos tipo fijo ni credito.',
    '- No cambiar el monto; solo mover fecha/tramo.',
    '- Priorizar mover el menor numero de items para aliviar deficit.',
    'Resumen de tramos (antes):',
    resumen,
    'Compromisos movibles:',
    moviblesTxt,
    'Devuelve maximo 3 sugerencias en este formato exacto:',
    '- Accion: mover "NOMBRE" de TRAMO_ORIGEN a TRAMO_DESTINO (dia sugerido X)',
    '  Impacto: TRAMO_ORIGEN $antes -> $despues | TRAMO_DESTINO $antes -> $despues',
    '  Motivo: texto corto',
    'Si no hay movimiento viable, explica por que y sugiere recorte alterno.'
  ].join('\n');
}

function simularMovimientoEntreTramos(scope, compromisoId, tramoDestinoId) {
  let base = getCompromisosMesActual();
  let tramosAntes = obtenerResumenTramos(scope, base);
  let compOriginal = base.find(c => c.id === compromisoId);
  if(!compOriginal) return null;

  let tramoOrigenId = obtenerTramoCompromiso(scope, compOriginal, tramosAntes);
  if(!tramoOrigenId || tramoOrigenId === tramoDestinoId) return null;

  let nuevoDia = obtenerDiaRepresentativoTramo(scope, tramoDestinoId, tramosAntes);
  let simulados = base.map(c => c.id === compromisoId ? { ...c, dia: nuevoDia } : { ...c });
  let tramosDespues = obtenerResumenTramos(scope, simulados);

  let origenAntes = tramosAntes.find(t => t.id === tramoOrigenId);
  let destinoAntes = tramosAntes.find(t => t.id === tramoDestinoId);
  let origenDespues = tramosDespues.find(t => t.id === tramoOrigenId);
  let destinoDespues = tramosDespues.find(t => t.id === tramoDestinoId);

  if(!origenAntes || !destinoAntes || !origenDespues || !destinoDespues) return null;

  return {
    scope,
    item: { id: compOriginal.id, nombre: compOriginal.nombre, valor: compOriginal.valor },
    origen: {
      id: tramoOrigenId,
      codigo: origenAntes.codigo,
      antes: origenAntes.saldoCierre,
      despues: origenDespues.saldoCierre
    },
    destino: {
      id: tramoDestinoId,
      codigo: destinoAntes.codigo,
      antes: destinoAntes.saldoCierre,
      despues: destinoDespues.saldoCierre
    },
    tramosAntes,
    tramosDespues
  };
}

function construirEscenarioBaseRebalanceo(scope, tramos, movibles) {
  let deficitarios = tramos
    .filter(t => t.saldoCierre < 0)
    .sort((a, b) => a.saldoCierre - b.saldoCierre);
  let conCapacidad = tramos
    .filter(t => t.saldoCierre > 0)
    .sort((a, b) => b.saldoCierre - a.saldoCierre);

  for(let i = 0; i < deficitarios.length; i++) {
    let origen = deficitarios[i];
    let candidatosOrigen = movibles.filter(m => m.tramoId === origen.id);
    if(!candidatosOrigen.length) continue;

    for(let j = 0; j < candidatosOrigen.length; j++) {
      let item = candidatosOrigen[j];
      let destino = conCapacidad.find(t => t.id !== origen.id && t.saldoCierre >= Math.round(item.valor * 0.6));
      if(!destino) continue;
      let simulacion = simularMovimientoEntreTramos(scope, item.id, destino.id);
      if(simulacion) return simulacion;
    }
  }

  return null;
}

function renderResumenTramosParaCard(tramos) {
  if(!tramos.length) return `<div class="ia-row"><div class="meta">No hay tramos disponibles para este mes.</div></div>`;
  return tramos.map(t => `
    <div class="ia-row">
      <div>
        <div class="nm">${escapeHTML(t.codigo)} · ${escapeHTML(t.nombre)}</div>
        <div class="meta">Ingresos ${formatCOP(t.ingresos)} · Gastos ${formatCOP(t.gastos)}</div>
      </div>
      <div class="vl" style="color:${t.saldoCierre >= 0 ? '#81e6b8' : '#ff9a9a'}">${formatCOP(t.saldoCierre)}</div>
    </div>
  `).join('');
}

function formatearEscenarioBase(simulacion) {
  if(!simulacion) return 'Escenario base automatico: no se encontro movimiento claro entre tramos con el contexto actual.';
  return [
    `Escenario base automatico: mover "${simulacion.item.nombre}" (${formatCOP(simulacion.item.valor)}) de ${simulacion.origen.codigo} a ${simulacion.destino.codigo}.`,
    `Impacto esperado: ${simulacion.origen.codigo} ${formatCOP(simulacion.origen.antes)} -> ${formatCOP(simulacion.origen.despues)} | ${simulacion.destino.codigo} ${formatCOP(simulacion.destino.antes)} -> ${formatCOP(simulacion.destino.despues)}.`
  ].join('\n');
}

function existeDeficitEnScope(scope, compromisosMes) {
  let tramos = obtenerResumenTramos(scope, compromisosMes);
  return tramos.some(t => t.saldoCierre < 0);
}

function buildIACardRebalanceo(titulo, tramos, stateKey, actionFnName) {
  let estado = iaPanelState[stateKey];
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';

  return `
    <div class="ia-card">
      <div class="ttl">${titulo}</div>
      ${renderResumenTramosParaCard(tramos)}
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : 'Rebalancear entre tramos ↗'}</button>
      ${resultado}
    </div>
  `;
}

function obtenerGastosVariablesPendientesMes() {
  return getCompromisosMesActual()
    .filter(c => !c.pagado && c.tipo === 'variable')
    .sort((a, b) => b.valor - a.valor);
}

function obtenerDiaReferenciaMesActivo() {
  let ahora = new Date();
  let { mes, anio } = parseMesKey(mesActivoGlobal);
  let mesIdx = ORDEN_MESES.indexOf(mes);
  let totalDias = new Date(anio, mesIdx + 1, 0).getDate();
  let mismoMes = ahora.getFullYear() === anio && ahora.getMonth() === mesIdx;
  if(mismoMes) return Math.min(Math.max(ahora.getDate(), 1), totalDias);
  return 1;
}

function obtenerGastosVariablesQuincena() {
  let todos = obtenerGastosVariablesPendientesMes();

  let qActiva = 'q1';
  let btnPre = document.getElementById('q-pre');
  let btnQ1 = document.getElementById('q-q1');
  let btnQ2 = document.getElementById('q-q2');
  if(btnPre && btnPre.classList.contains('on')) qActiva = 'pre';
  if(btnQ1 && btnQ1.classList.contains('on')) qActiva = 'q1';
  if(btnQ2 && btnQ2.classList.contains('on')) qActiva = 'q2';

  return todos.filter(c => {
    let dia = parseInt(c.dia, 10);
    if(dia === -1) dia = 1;
    if(qActiva === 'pre') return parseInt(c.dia, 10) === -1;
    if(qActiva === 'q1') return dia >= 1 && dia <= 14;
    return dia >= 15;
  });
}

function obtenerGastosVariablesSemana() {
  let todos = obtenerGastosVariablesPendientesMes();
  let semanas = obtenerSemanasDelMesActivo();
  if(!semanas.length) return [];
  let idx = Math.min(Math.max(semanaSeleccionadaIndex, 0), semanas.length - 1);
  let semanaActiva = semanas[idx] || semanas[0];
  return todos.filter(c => {
    let dia = parseInt(c.dia, 10);
    if(dia === -1) dia = 1;
    return semanaActiva.dias.includes(dia);
  });
}

function renderItemsIACard(items, emptyText) {
  if(!items.length) return `<div class="ia-row"><div class="meta">${escapeHTML(emptyText)}</div></div>`;
  return items.slice(0, 8).map(it => `
    <div class="ia-row">
      <div>
        <div class="nm">${escapeHTML(it.nombre)}</div>
        <div class="meta">Dia ${it.dia === -1 ? 'pre-mes' : it.dia}</div>
      </div>
      <div class="vl">${formatCOP(it.valor)}</div>
    </div>
  `).join('');
}

function buildIACardGastos(titulo, items, stateKey, actionFnName) {
  let estado = iaPanelState[stateKey];
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';
  return `
    <div class="ia-card">
      <div class="ttl">${titulo}</div>
      ${renderItemsIACard(items, `No hay gastos pendientes para ${titulo.toLowerCase()}.`)}
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : 'Analizar qué puedo reducir ↗'}</button>
      ${resultado}
    </div>
  `;
}

function getEstadoIAPanelSimple(stateKey) {
  if(!iaPanelState[stateKey] || typeof iaPanelState[stateKey] !== 'object') {
    iaPanelState[stateKey] = { loading: false, error: '', result: '' };
  }
  return iaPanelState[stateKey];
}

function construirSnapshotMensualIA(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let ingresos = obtenerEventosIngresoDelMes(mesActivoGlobal).reduce((acc, e) => acc + (e.valor || 0), 0);
  let gastos = base.reduce((acc, c) => acc + (c.valor || 0), 0);
  let pendiente = base.reduce((acc, c) => acc + (!c.pagado ? (c.valor || 0) : 0), 0);
  let balance = ingresos - gastos;
  let ratioPendiente = 0;
  if(ingresos > 0) {
    ratioPendiente = pendiente / ingresos;
  } else if(pendiente > 0) {
    ratioPendiente = 1;
  }

  return {
    ingresos,
    gastos,
    pendiente,
    balance,
    ratioPendiente
  };
}

function generarAlertasDeficitTempranasIA(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let snapshot = construirSnapshotMensualIA(base);
  let semanas = obtenerResumenTramosSemanales(base);
  let alertas = [];

  let semanasDeficit = semanas.filter((s) => s.saldoCierre < 0);
  if(semanasDeficit.length) {
    let primera = semanasDeficit[0];
    alertas.push(`Riesgo semanal temprano: ${primera.nombre} cierra en ${formatCOP(primera.saldoCierre)}.`);
  }

  if(snapshot.balance < 0) {
    alertas.push(`Riesgo mensual: balance proyectado en deficit por ${formatCOP(Math.abs(snapshot.balance))}.`);
  }

  if(snapshot.ratioPendiente >= 0.8) {
    alertas.push(`Carga pendiente alta: ${Math.round(snapshot.ratioPendiente * 100)}% de ingresos comprometidos.`);
  }

  if(!alertas.length) {
    alertas.push('Sin alerta critica: no se detecta deficit semanal ni mensual con los datos actuales.');
  }

  let riesgoGlobal = 'bajo';
  if(snapshot.balance < 0 || semanasDeficit.length >= 2 || snapshot.ratioPendiente >= 0.95) riesgoGlobal = 'alto';
  else if(semanasDeficit.length || snapshot.ratioPendiente >= 0.8) riesgoGlobal = 'medio';

  return {
    riesgoGlobal,
    alertas,
    semanasDeficit,
    snapshot
  };
}

function construirPromptResumenMensualIA(snapshot, alertaInfo) {
  return [
    'Actua como asesor financiero personal y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Ingresos: ${formatCOP(snapshot.ingresos)}.`,
    `Gastos: ${formatCOP(snapshot.gastos)}.`,
    `Balance: ${formatCOP(snapshot.balance)}.`,
    `Pendiente por pagar: ${formatCOP(snapshot.pendiente)}.`,
    `Riesgo global detectado: ${alertaInfo.riesgoGlobal}.`,
    'Alertas detectadas:',
    alertaInfo.alertas.map((a, idx) => `${idx + 1}. ${a}`).join('\n'),
    'Entrega un resumen mensual entendible con 5 bullets maximo:',
    '- estado general',
    '- principal riesgo',
    '- accion inmediata sugerida',
    '- accion para siguiente semana',
    '- meta de control'
  ].join('\n');
}

function construirPromptAlertasDeficitIA(alertaInfo) {
  return [
    'Actua como monitor de riesgo financiero y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    `Riesgo global actual: ${alertaInfo.riesgoGlobal}.`,
    'Alertas calculadas:',
    alertaInfo.alertas.map((a, idx) => `${idx + 1}. ${a}`).join('\n'),
    'Devuelve una alerta temprana operativa en maximo 4 bullets:',
    '- riesgo semanal',
    '- riesgo mensual',
    '- trigger concreto (cuando actuar)',
    '- mitigacion inmediata'
  ].join('\n');
}

function calcularMetricasEscenarioIA(compromisosMes) {
  let base = Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual();
  let snapshot = construirSnapshotMensualIA(base);
  let semanas = obtenerResumenTramosSemanales(base);
  let deficitSemanas = semanas.filter((s) => s.saldoCierre < 0).length;
  return {
    ...snapshot,
    deficitSemanas
  };
}

function simularEscenariosBaseIA(compromisosMes) {
  let base = (Array.isArray(compromisosMes) ? compromisosMes : getCompromisosMesActual()).map((c) => ({ ...c }));
  let escenarios = [];
  let antes = calcularMetricasEscenarioIA(base);

  let variablesPendientes = base
    .filter((c) => !c.pagado && c.tipo === 'variable')
    .sort((a, b) => (b.valor || 0) - (a.valor || 0));

  let topVariable = variablesPendientes[0] || null;
  if(topVariable) {
    let clonado = base.map((c) => ({ ...c }));
    let target = clonado.find((c) => c.id === topVariable.id);
    if(target) {
      let original = Math.round(target.valor || 0);
      let nuevo = Math.max(1, Math.round(original * 0.9));
      target.valor = nuevo;
      let despues = calcularMetricasEscenarioIA(clonado);
      escenarios.push({
        nombre: 'Reducir 10% el mayor gasto variable',
        detalle: `${target.nombre}: ${formatCOP(original)} -> ${formatCOP(nuevo)}`,
        antes,
        despues
      });
    }
  }

  let moverQ2 = variablesPendientes.find((c) => {
    let dia = parseInt(c.dia, 10);
    return dia === -1 || (dia >= 1 && dia <= 14);
  });
  if(moverQ2) {
    let clonado = base.map((c) => ({ ...c }));
    let target = clonado.find((c) => c.id === moverQ2.id);
    if(target) {
      let diaAntes = parseInt(target.dia, 10);
      target.dia = 20;
      let despues = calcularMetricasEscenarioIA(clonado);
      escenarios.push({
        nombre: 'Mover fecha de gasto fuerte hacia Q2',
        detalle: `${target.nombre}: dia ${diaAntes === -1 ? 'pre-mes' : diaAntes} -> dia 20`,
        antes,
        despues
      });
    }
  }

  let mayorPendiente = base
    .filter((c) => !c.pagado)
    .sort((a, b) => (b.valor || 0) - (a.valor || 0))[0] || null;
  if(mayorPendiente) {
    let clonado = base.map((c) => ({ ...c }));
    let target = clonado.find((c) => c.id === mayorPendiente.id);
    if(target) {
      let diaAntes = parseInt(target.dia, 10);
      let diaBase = diaAntes === -1 ? 1 : diaAntes;
      let ultimoDiaMes = 31;
      let [mesNombre, anioTxt] = String(mesActivoGlobal || '').trim().split(/\s+/);
      let anio = parseInt(anioTxt, 10);
      let ordenMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      let mesIdx = ordenMeses.indexOf(mesNombre);
      if(!isNaN(anio) && mesIdx >= 0) {
        ultimoDiaMes = new Date(anio, mesIdx + 1, 0).getDate();
      }
      target.dia = Math.min(diaBase + 7, ultimoDiaMes);
      let despues = calcularMetricasEscenarioIA(clonado);
      escenarios.push({
        nombre: 'Posponer 7 dias la mayor obligacion pendiente',
        detalle: `${target.nombre}: dia ${diaAntes === -1 ? 'pre-mes' : diaAntes} -> dia ${target.dia}`,
        antes,
        despues
      });
    }
  }

  return escenarios;
}

function formatearEscenariosIA(escenarios) {
  if(!Array.isArray(escenarios) || !escenarios.length) {
    return 'No se encontraron escenarios utiles con el contexto actual.';
  }

  return escenarios.map((esc, idx) => {
    let deltaBalance = (esc.despues.balance || 0) - (esc.antes.balance || 0);
    let mejoraSemanas = (esc.antes.deficitSemanas || 0) - (esc.despues.deficitSemanas || 0);
    return [
      `${idx + 1}) ${esc.nombre}`,
      `- Ajuste: ${esc.detalle}`,
      `- Balance: ${formatCOP(esc.antes.balance)} -> ${formatCOP(esc.despues.balance)} (${deltaBalance >= 0 ? '+' : ''}${formatCOP(deltaBalance)})`,
      `- Semanas en deficit: ${esc.antes.deficitSemanas} -> ${esc.despues.deficitSemanas} (mejora ${mejoraSemanas})`
    ].join('\n');
  }).join('\n\n');
}

function construirPromptEscenariosIA(escenarios) {
  return [
    'Actua como asesor financiero y responde en espanol colombiano.',
    `Mes analizado: ${mesActivoGlobal}.`,
    'Escenarios simulados:',
    formatearEscenariosIA(escenarios),
    'Resume en maximo 5 bullets:',
    '- cual escenario conviene primero',
    '- beneficio principal',
    '- riesgo de ejecutar ese cambio',
    '- plan de control para confirmar mejora'
  ].join('\n');
}

function buildIACardSimpleResultado(titulo, meta, stateKey, actionFnName, ctaText) {
  let estado = getEstadoIAPanelSimple(stateKey);
  let resultado = estado.result
    ? `<div class="ia-result ${estado.error ? 'error' : ''}">${escapeHTML(estado.result)}</div>`
    : '';

  return `
    <div class="ia-card">
      <div class="ttl">${titulo}</div>
      <div class="ia-row" style="display:block;">
        <div class="meta">${escapeHTML(meta)}</div>
      </div>
      <button class="ia-cta" onclick="${actionFnName}()" ${estado.loading ? 'disabled' : ''}>${estado.loading ? 'Analizando...' : ctaText}</button>
      ${resultado}
    </div>
  `;
}

function obtenerMensajeIAValido(out) {
  if(!out || out.ok === false) {
    throw new Error((out && out.message) ? out.message : 'Sin respuesta valida desde IA.');
  }
  return out.message || 'Sin respuesta.';
}

async function pedirResumenMensualIA() {
  let stateKey = 'resumenMensual';
  let snapshot = construirSnapshotMensualIA(getCompromisosMesActual());
  let alertaInfo = generarAlertasDeficitTempranasIA(getCompromisosMesActual());

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  renderIAPanelResumen();

  try {
    let prompt = construirPromptResumenMensualIA(snapshot, alertaInfo);
    let out = await ejecutarConsultaIA(prompt);
    let mensaje = obtenerMensajeIAValido(out);
    iaPanelState[stateKey] = { loading: false, error: '', result: mensaje };
  } catch(_err) {
    let fallback = [
      `Estado general: ingresos ${formatCOP(snapshot.ingresos)}, gastos ${formatCOP(snapshot.gastos)}, balance ${formatCOP(snapshot.balance)}.`,
      `Pendiente por pagar: ${formatCOP(snapshot.pendiente)} (${Math.round(snapshot.ratioPendiente * 100)}% de ingresos).`,
      `Riesgo actual: ${alertaInfo.riesgoGlobal}.`,
      `Accion inmediata: ${alertaInfo.alertas[0] || 'Revisar top 3 gastos variables.'}`
    ].join('\n');
    iaPanelState[stateKey] = { loading: false, error: '', result: fallback };
  }

  renderIAPanelResumen();
}

async function analizarAlertasDeficitIA() {
  let stateKey = 'alertasDeficit';
  let alertaInfo = generarAlertasDeficitTempranasIA(getCompromisosMesActual());

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  renderIAPanelResumen();

  try {
    let prompt = construirPromptAlertasDeficitIA(alertaInfo);
    let out = await ejecutarConsultaIA(prompt);
    let mensaje = obtenerMensajeIAValido(out);
    iaPanelState[stateKey] = { loading: false, error: '', result: mensaje };
  } catch(_err) {
    let fallback = [`Riesgo global: ${alertaInfo.riesgoGlobal}.`]
      .concat(alertaInfo.alertas.map((a) => `- ${a}`))
      .join('\n');
    iaPanelState[stateKey] = { loading: false, error: '', result: fallback };
  }

  renderIAPanelResumen();
}

async function simularEscenariosIA() {
  let stateKey = 'simuladorEscenarios';
  let escenarios = simularEscenariosBaseIA(getCompromisosMesActual());

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  renderIAPanelResumen();

  if(!escenarios.length) {
    iaPanelState[stateKey] = {
      loading: false,
      error: '',
      result: 'No hay escenarios simulables: revisa si existen obligaciones pendientes o gastos variables.'
    };
    renderIAPanelResumen();
    return;
  }

  try {
    let prompt = construirPromptEscenariosIA(escenarios);
    let out = await ejecutarConsultaIA(prompt);
    let mensaje = obtenerMensajeIAValido(out);
    let detalle = formatearEscenariosIA(escenarios);
    iaPanelState[stateKey] = {
      loading: false,
      error: '',
      result: `${detalle}\n\nLectura IA:\n${mensaje}`
    };
  } catch(_err) {
    iaPanelState[stateKey] = { loading: false, error: '', result: formatearEscenariosIA(escenarios) };
  }

  renderIAPanelResumen();
}

function renderIAPanelResumen() {
  let nodo = document.getElementById('ia-panel-resumen');
  if(!nodo) return;

  actualizarEstadoAplicadoDesdeHistorialIA();
  let gastosMes = obtenerGastosVariablesPendientesMes();
  let st = getEstadoRecortesItemsMes();
  if(!Array.isArray(st.items)) st.items = [];

  nodo.innerHTML = `
    ${buildIACardSimpleResultado('Resumen mensual IA', 'Vista ejecutiva con ingresos, gastos, balance y riesgos del mes activo.', 'resumenMensual', 'pedirResumenMensualIA', 'Generar resumen mensual ↗')}
    ${buildIACardSimpleResultado('Alertas de deficit IA', 'Deteccion temprana de riesgo semanal y mensual para actuar antes del cierre.', 'alertasDeficit', 'analizarAlertasDeficitIA', 'Evaluar alertas tempranas ↗')}
    ${buildIACardSimpleResultado('Simulador de escenarios IA', 'Simula mover fecha o monto para estimar impacto en balance y semanas en deficit.', 'simuladorEscenarios', 'simularEscenariosIA', 'Simular escenarios de impacto ↗')}
    ${buildIACardGastos('Gastos este mes', gastosMes, 'gastosMes', 'analizarReduccionGastosMesIA')}
    ${buildIACardRecortesItemsMes(gastosMes, 'recortesItemsMes', 'analizarRecortesItemMesIA')}
    ${buildIACardHistorialIA()}
  `;
}

function renderIAPanelSemanal() {
  let nodo = document.getElementById('ia-panel-semanal');
  if(!nodo) return;
  let gastosSemana = obtenerGastosVariablesSemana();
  nodo.innerHTML = `
    ${buildIACardGastos('Gastos esta semana', gastosSemana, 'gastosSemana', 'analizarReduccionGastosSemanaIA')}
  `;
}

function renderIAPanelQuincena() {
  let nodo = document.getElementById('ia-panel-quincena');
  if(!nodo) return;
  let gastosQuincena = obtenerGastosVariablesQuincena();
  nodo.innerHTML = `
    ${buildIACardGastos('Gastos esta quincena', gastosQuincena, 'gastosQuincena', 'analizarReduccionGastosQuincenaIA')}
  `;

  if(typeof renderBalanceQuincena === 'function') {
    renderBalanceQuincena(getCompromisosMesActual());
  }
}

function renderIAPanelDeudas() {
  let nodo = document.getElementById('ia-panel-deudas');
  if(!nodo) return;

  let deudasPendientes = getCompromisosMesActual()
    .filter(c => !c.pagado && c.tipo !== 'credito' && /deuda|prestamo|pr[eé]stamo|vank|vecin/i.test(String(c.nombre || '')))
    .sort((a, b) => b.valor - a.valor);

  let lista = renderItemsIACard(deudasPendientes, 'No hay deudas pendientes detectadas para este mes.');
  let resultado = iaPanelState.deudas.result
    ? `<div class="ia-result ${iaPanelState.deudas.error ? 'error' : ''}">${escapeHTML(iaPanelState.deudas.result)}</div>`
    : '';

  nodo.innerHTML = `
    <div class="ia-card">
      <div class="ttl">Deudas pendientes</div>
      ${lista}
      <button class="ia-cta" onclick="pedirEstrategiaDeudasIA()" ${iaPanelState.deudas.loading ? 'disabled' : ''}>${iaPanelState.deudas.loading ? 'Analizando...' : 'Pedir estrategia para pagar deudas ↗'}</button>
      ${resultado}
    </div>
  `;
}

function refreshIAPanels(scope = 'all') {
  if(scope === 'resumen') {
    renderIAPanelResumen();
    return;
  }
  if(scope === 'resumen-deudas') {
    renderIAPanelResumen();
    renderIAPanelDeudas();
    return;
  }
  if(scope === 'tramos') {
    renderIAPanelSemanal();
    renderIAPanelQuincena();
    return;
  }

  renderIAPanelResumen();
  renderIAPanelSemanal();
  renderIAPanelQuincena();
}

function refreshTramosAndWeekView() {
  renderSemanaActiva(getCompromisosMesActual());
  refreshIAPanels('tramos');
}

async function pedirEstrategiaDeudasIA() {
  let items = getCompromisosMesActual()
    .filter(c => !c.pagado && c.tipo !== 'credito' && /deuda|prestamo|pr[eé]stamo|vank|vecin/i.test(String(c.nombre || '')))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  if(items.length === 0) {
    iaPanelState.deudas = { loading: false, error: '', result: 'No se encontraron deudas personales para analizar en este mes.' };
    refreshIAPanels('resumen-deudas');
    return;
  }

  iaPanelState.deudas = { loading: true, error: '', result: '' };
  refreshIAPanels('resumen-deudas');

  try {
    let prompt = construirPromptEstrategiaDeudas(items);
    let out = await ejecutarConsultaIA(prompt);
    iaPanelState.deudas = { loading: false, error: '', result: out.message || 'Sin respuesta.' };
  } catch(err) {
    iaPanelState.deudas = { loading: false, error: '1', result: err && err.message ? err.message : 'No se pudo generar estrategia.' };
  }

  refreshIAPanels('resumen-deudas');
}

async function analizarReduccionGastosIA(scope) {
  let items = [];
  let stateKey = 'gastosMes';

  if(scope === 'quincena') {
    items = obtenerGastosVariablesQuincena();
    stateKey = 'gastosQuincena';
  } else if(scope === 'semana') {
    items = obtenerGastosVariablesSemana();
    stateKey = 'gastosSemana';
  } else {
    items = obtenerGastosVariablesPendientesMes();
    stateKey = 'gastosMes';
  }

  items = items.slice(0, 10);

  if(items.length === 0) {
    iaPanelState[stateKey] = { loading: false, error: '', result: 'No hay gastos pendientes para analizar en este bloque.' };
    refreshIAPanels();
    return;
  }

  iaPanelState[stateKey] = { loading: true, error: '', result: '' };
  refreshIAPanels();

  try {
    let prompt = construirPromptRecorteVariables(items);
    let out = await ejecutarConsultaIA(prompt);
    iaPanelState[stateKey] = { loading: false, error: '', result: out.message || 'Sin respuesta.' };
  } catch(err) {
    iaPanelState[stateKey] = { loading: false, error: '1', result: err && err.message ? err.message : 'No se pudo analizar recortes.' };
  }

  refreshIAPanels();
}

async function analizarReduccionGastosMesIA() {
  return analizarReduccionGastosIA('mes');
}

async function analizarReduccionGastosQuincenaIA() {
  return analizarReduccionGastosIA('quincena');
}

async function analizarReduccionGastosSemanaIA() {
  return analizarReduccionGastosIA('semana');
}

async function analizarRecortesItemMesIA() {
  let stateKey = 'recortesItemsMes';
  let items = obtenerGastosVariablesPendientesMes().slice(0, 12);

  if(items.length === 0) {
    iaPanelState[stateKey] = { loading: false, error: '', result: 'No hay gastos variables pendientes para sugerir recortes.', items: [] };
    refreshIAPanels('resumen');
    return;
  }

  iaPanelState[stateKey] = { loading: true, error: '', result: '', items: [] };
  refreshIAPanels('resumen');

  try {
    let prompt = construirPromptRecortesItemAccionables(items);
    let out = await ejecutarConsultaIA(prompt);
    let parsed = extraerJSONDeTextoIA(out.message);
    let sugerencias = normalizarSugerenciasRecorteDesdeIA(parsed, items);
    if(!sugerencias.length) {
      sugerencias = generarSugerenciasFallbackRecorte(items);
    }

    let ahorroTotal = sugerencias.reduce((acc, s) => acc + (s.ahorroEstimado || 0), 0);
    iaPanelState[stateKey] = {
      loading: false,
      error: '',
      result: `Sugerencias listas. Ahorro total proyectado: ${formatCOP(ahorroTotal)}.`,
      items: sugerencias
    };
  } catch(err) {
    let fallback = generarSugerenciasFallbackRecorte(items);
    let msgError = err && err.message ? err.message : 'No se pudo generar recortes con IA.';
    iaPanelState[stateKey] = {
      loading: false,
      error: '1',
      result: `${msgError}\nSe muestran sugerencias fallback para no bloquear flujo.`,
      items: fallback
    };
  }

  refreshIAPanels('resumen');
}

function aplicarSugerenciaRecorteMesIA(index) {
  let stateKey = 'recortesItemsMes';
  let estado = getEstadoRecortesItemsMes();
  let sugerencias = Array.isArray(estado.items) ? estado.items : [];
  let sug = sugerencias[index];
  if(!sug || sug.applied) return;

  let comp = appData.compromisos.find(c => c.id === sug.itemId && c.mesKey === mesActivoGlobal);
  if(!comp) {
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = `No se encontro el item ${sug.nombre} en el mes activo.`;
    refreshIAPanels('resumen');
    return;
  }

  let accion = normalizarAccionIAUnificada(sug, {
    source: 'recorte',
    allowedItemIds: getCompromisosMesActual().map(c => c.id)
  });
  if(!accion) {
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = 'Sugerencia invalida: no cumple contrato de accion IA.';
    refreshIAPanels('resumen');
    return;
  }

  let preview = construirPreviewAccionIA(accion, getCompromisosMesActual());
  let confirmar = confirm(construirTextoConfirmacionAccionIA(accion, comp.nombre, preview));
  if(!confirmar) return;

  let ahorroReal = 0;
  let cambio = '';
  let idxComp = appData.compromisos.findIndex(c => c.id === sug.itemId && c.mesKey === mesActivoGlobal);
  if(idxComp < 0) {
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = `No se encontro el item ${sug.nombre} en el mes activo.`;
    refreshIAPanels('resumen');
    return;
  }

  let prevComp = { ...appData.compromisos[idxComp] };

  try {
    if(accion.accion === 'reducir') {
      let actual = Math.round(appData.compromisos[idxComp].valor);
      let nuevo = Math.round(accion.nuevoValor || Math.max(1000, Math.round(actual * 0.85)));
      nuevo = Math.max(1, Math.min(nuevo, actual - 1));
      ahorroReal = Math.max(0, actual - nuevo);
      appData.compromisos[idxComp].valor = nuevo;
      cambio = `Reducido ${appData.compromisos[idxComp].nombre} de ${formatCOP(actual)} a ${formatCOP(nuevo)}.`;
    } else if(accion.accion === 'posponer') {
      let diaAntes = parseInt(appData.compromisos[idxComp].dia, 10);
      let nuevoDia = accion.diaSugerido;
      if(nuevoDia === null || isNaN(parseInt(nuevoDia, 10))) nuevoDia = resolverDiaPospuesto(diaAntes);
      appData.compromisos[idxComp].dia = nuevoDia;
      cambio = `Pospuesto ${appData.compromisos[idxComp].nombre} del dia ${diaAntes === -1 ? 'pre-mes' : diaAntes} al dia ${nuevoDia === -1 ? 'pre-mes' : nuevoDia}.`;
    } else {
      let diaAntes = parseInt(appData.compromisos[idxComp].dia, 10);
      let diaDestino = resolverDiaTramoDestinoMes(accion.tramoDestino);
      if(diaDestino === null) {
        diaDestino = diaAntes <= 14 ? 20 : 10;
      }
      appData.compromisos[idxComp].dia = diaDestino;
      cambio = `Movido ${appData.compromisos[idxComp].nombre} del tramo ${obtenerEtiquetaTramoPorDia(diaAntes)} a ${obtenerEtiquetaTramoPorDia(diaDestino)}.`;
    }

    sug.applied = true;
    sug.appliedAt = new Date().toISOString();
    sug.ahorroReal = ahorroReal;

    let evento = registrarEventoHistorialIA({
      source: 'recorte',
      action: accion.accion,
      monthKey: mesActivoGlobal,
      itemName: appData.compromisos[idxComp].nombre,
      reason: sug.motivo || '',
      before: prevComp,
      after: appData.compromisos[idxComp],
      meta: {
        ahorroReal,
        ahorroEstimado: sug.ahorroEstimado || 0,
        riesgo: sug.riesgo,
        prioridad: sug.prioridad
      }
    });
    if(evento) sug.historyEventId = evento.id;

    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());

    sug.undoPayload = {
      prevComp,
      newComp: { ...appData.compromisos[idxComp] },
      mesKey: mesActivoGlobal,
      at: new Date().toISOString()
    };
  } catch(err) {
    appData.compromisos[idxComp] = { ...prevComp };
    sug.applied = false;
    delete sug.appliedAt;
    delete sug.ahorroReal;
    iaPanelState[stateKey].error = '1';
    iaPanelState[stateKey].result = `No se pudo aplicar la accion de forma segura: ${err && err.message ? err.message : 'error desconocido'}.`;
    refreshIAPanels('resumen');
    return;
  }

  let ahorroAcumulado = sugerencias.reduce((acc, s) => acc + (s.ahorroReal || 0), 0);
  iaPanelState[stateKey].error = '';
  iaPanelState[stateKey].result = `${cambio}\nAhorro real acumulado aplicado: ${formatCOP(ahorroAcumulado)}.`;

  initApp();
}

function obtenerEstadoRebalanceo(scope) {
  let stateKey = scope === 'semana' ? 'rebalanceSemana' : 'rebalanceQuincena';
  if(!iaPanelState[stateKey] || typeof iaPanelState[stateKey] !== 'object') {
    iaPanelState[stateKey] = { loading: false, error: false, result: '', actions: [] };
  }
  if(!Array.isArray(iaPanelState[stateKey].actions)) iaPanelState[stateKey].actions = [];
  return { stateKey, state: iaPanelState[stateKey] };
}

function construirTextoImpactoRebalanceo(scope, accion) {
  if(!accion || !accion.tramoDestino) return 'Impacto estimado no disponible.';
  let simulacion = simularMovimientoEntreTramos(scope, accion.itemId, accion.tramoDestino);
  if(!simulacion) return 'Impacto estimado no disponible.';
  return `${simulacion.origen.codigo}: ${formatCOP(simulacion.origen.antes)} -> ${formatCOP(simulacion.origen.despues)} | ${simulacion.destino.codigo}: ${formatCOP(simulacion.destino.antes)} -> ${formatCOP(simulacion.destino.despues)}`;
}

function renderAccionesRebalanceoIA(scope) {
  let { state } = obtenerEstadoRebalanceo(scope);
  let acciones = Array.isArray(state.actions) ? state.actions : [];
  if(!acciones.length) return '';

  let compromisosMes = getCompromisosMesActual();
  return acciones.map((accion, idx) => {
    let comp = compromisosMes.find(c => c.id === accion.itemId) || null;
    let nombre = comp ? comp.nombre : (accion.nombre || `Item ${accion.itemId}`);
    let impacto = construirTextoImpactoRebalanceo(scope, accion);
    let destinoTxt = accion.tramoDestino ? String(accion.tramoDestino).toUpperCase() : 'N/D';

    return `
      <div class="ia-row" style="display:block;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div>
            <div class="nm">${escapeHTML(nombre)}</div>
            <div class="meta">Accion: mover_tramo · Destino ${escapeHTML(destinoTxt)}</div>
            <div class="meta">${escapeHTML(impacto)}</div>
            <div class="meta" style="margin-top:2px;">${escapeHTML(accion.motivo || 'Sin motivo detallado.')}</div>
          </div>
          ${accion.applied
            ? `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="deshacerAccionRebalanceoIA('${scope}', ${idx})">Deshacer cambio</button>`
            : `<button class="ia-cta" style="width:auto;min-width:120px;padding:7px 10px;margin-top:0;" onclick="aplicarAccionRebalanceoIA('${scope}', ${idx})">Aplicar</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function aplicarAccionRebalanceoIA(scope, index) {
  let { state } = obtenerEstadoRebalanceo(scope);
  let acciones = state.actions;
  let accion = acciones[index];

  if(!accion || accion.applied) return;
  if(accion.accion !== 'mover_tramo') {
    state.error = true;
    state.result = 'La accion de rebalanceo no es valida para aplicar.';
    initApp();
    return;
  }

  let idxComp = appData.compromisos.findIndex(c => c.id === accion.itemId && c.mesKey === mesActivoGlobal);
  if(idxComp < 0) {
    state.error = true;
    state.result = 'No se encontro el item de rebalanceo en el mes activo.';
    initApp();
    return;
  }

  let tramos = obtenerResumenTramos(scope, getCompromisosMesActual());
  let compActual = appData.compromisos[idxComp];
  let tramoOrigen = obtenerTramoCompromiso(scope, compActual, tramos);
  let tramoDestino = accion.tramoDestino;
  if(!tramoDestino) {
    state.error = true;
    state.result = 'La accion no trae tramo destino para aplicar.';
    initApp();
    return;
  }
  if(tramoOrigen === tramoDestino) {
    state.error = true;
    state.result = 'El item ya se encuentra en el tramo destino sugerido.';
    initApp();
    return;
  }

  let nuevoDia = obtenerDiaRepresentativoTramo(scope, tramoDestino, tramos);
  if(nuevoDia === null || nuevoDia === undefined || isNaN(parseInt(nuevoDia, 10))) {
    state.error = true;
    state.result = 'No se pudo resolver un dia valido para el tramo destino.';
    initApp();
    return;
  }

  let preview = construirTextoImpactoRebalanceo(scope, accion);
  let confirmar = confirm(`Mover ${compActual.nombre} de ${String(tramoOrigen || 'N/D').toUpperCase()} a ${String(tramoDestino).toUpperCase()}?\n${preview}`);
  if(!confirmar) return;

  let prevComp = { ...appData.compromisos[idxComp] };
  try {
    appData.compromisos[idxComp].dia = nuevoDia;
    accion.applied = true;
    accion.appliedAt = new Date().toISOString();
    let evento = registrarEventoHistorialIA({
      source: `rebalance-${scope}`,
      action: 'mover_tramo',
      monthKey: mesActivoGlobal,
      itemName: appData.compromisos[idxComp].nombre,
      reason: accion.motivo || '',
      before: prevComp,
      after: appData.compromisos[idxComp],
      meta: {
        scope,
        tramoDestino: accion.tramoDestino
      }
    });
    if(evento) accion.historyEventId = evento.id;
    accion.undoPayload = {
      prevComp,
      newComp: { ...appData.compromisos[idxComp] },
      mesKey: mesActivoGlobal,
      at: new Date().toISOString()
    };

    persistirDataPrincipalConFallback();
    persistirAuxiliaresConFallback(new Date().toISOString());
  } catch(err) {
    appData.compromisos[idxComp] = { ...prevComp };
    accion.applied = false;
    delete accion.appliedAt;
    delete accion.undoPayload;
    state.error = true;
    state.result = `No se pudo aplicar el rebalanceo: ${err && err.message ? err.message : 'error desconocido'}.`;
    initApp();
    return;
  }

  state.error = false;
  state.result = `Rebalanceo aplicado en ${compActual.nombre}.`;
  initApp();
}

function deshacerAccionRebalanceoIA(scope, index) {
  let { state } = obtenerEstadoRebalanceo(scope);
  let acciones = state.actions;
  let accion = acciones[index];

  if(!accion || !accion.applied || !accion.undoPayload || !accion.undoPayload.prevComp) {
    state.error = true;
    state.result = 'No hay un cambio de rebalanceo aplicado para deshacer.';
    initApp();
    return;
  }

  let prev = accion.undoPayload.prevComp;
  let idxComp = appData.compromisos.findIndex(c => c.id === prev.id && c.mesKey === prev.mesKey);
  if(idxComp < 0) {
    state.error = true;
    state.result = 'No se pudo deshacer: el item ya no existe en el mes activo.';
    initApp();
    return;
  }

  appData.compromisos[idxComp] = { ...prev };
  if(accion.historyEventId) {
    let evt = obtenerEventoHistorialIA(accion.historyEventId);
    if(evt && !evt.revertedAt) evt.revertedAt = new Date().toISOString();
  }
  accion.applied = false;
  delete accion.appliedAt;
  delete accion.undoPayload;
  delete accion.historyEventId;

  persistirDataPrincipalConFallback();
  persistirAuxiliaresConFallback(new Date().toISOString());

  state.error = false;
  state.result = `Cambio deshecho para ${prev.nombre}.`;
  initApp();
}

async function analizarRebalanceoIA(scope) {
  let stateKey = scope === 'semana' ? 'rebalanceSemana' : 'rebalanceQuincena';
  let tramos = obtenerResumenTramos(scope);
  let movibles = obtenerCompromisosMovibles(scope, tramos, getCompromisosMesActual());
  let hayDeficit = tramos.some(t => t.saldoCierre < 0);
  let haySuperavit = tramos.some(t => t.saldoCierre > 0);

  if(!hayDeficit) {
    iaPanelState[stateKey] = { loading: false, error: false, result: '', actions: [] };
    refreshTramosAndWeekView();
    return;
  }

  if(!haySuperavit) {
    iaPanelState[stateKey] = { loading: false, error: false, result: 'No hay tramos con capacidad para recibir movimientos.', actions: [] };
    refreshTramosAndWeekView();
    return;
  }

  if(!movibles.length) {
    iaPanelState[stateKey] = { loading: false, error: false, result: 'No hay obligaciones variables pendientes para mover entre tramos.', actions: [] };
    refreshTramosAndWeekView();
    return;
  }

  iaPanelState[stateKey] = { loading: true, error: false, result: '', actions: [] };
  refreshTramosAndWeekView();

  try {
    let prompt = construirPromptRebalanceoTramos(scope, tramos, movibles);
    let out = await ejecutarConsultaIA(prompt);
    let escenarioBase = construirEscenarioBaseRebalanceo(scope, tramos, movibles);
    let resumenEscenario = formatearEscenarioBase(escenarioBase);
    let accionesRebalanceo = [];
    if(escenarioBase && escenarioBase.item && escenarioBase.destino) {
      let accionRaw = {
        source: 'rebalanceo',
        itemId: escenarioBase.item.id,
        accion: 'mover_tramo',
        ahorroEstimado: 0,
        riesgo: 'medio',
        prioridad: 'alta',
        tramoDestino: escenarioBase.destino.id,
        motivo: 'Accion estructurada desde escenario base de rebalanceo.'
      };
      let validada = normalizarAccionIAUnificada(accionRaw, {
        source: 'rebalanceo',
        allowedItemIds: movibles.map(m => m.id)
      });
      if(validada) {
        validada.tramoDestino = escenarioBase.destino.id;
        validada.scope = scope;
        validada.nombre = escenarioBase.item.nombre;
        accionesRebalanceo.push(validada);
      }
    }

    iaPanelState[stateKey] = {
      loading: false,
      error: false,
      result: `${resumenEscenario}\n\nSugerencias IA:\n${out.message || 'Sin respuesta.'}`,
      actions: accionesRebalanceo
    };
  } catch(err) {
    iaPanelState[stateKey] = {
      loading: false,
      error: true,
      result: err && err.message ? err.message : 'No se pudo generar rebalanceo entre tramos.',
      actions: []
    };
  }

  refreshTramosAndWeekView();
}

async function analizarRebalanceoSemanaIA() {
  return analizarRebalanceoIA('semana');
}

async function analizarRebalanceoQuincenaIA() {
  return analizarRebalanceoIA('quincena');
}
