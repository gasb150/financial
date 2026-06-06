// IA module extracted from app.js for maintainability.

function toggleExpandIAActionable(key) {
  let expandState = globalThis.__iaActionablesExpandState;
  if(!(expandState instanceof Set)) {
    expandState = new Set();
    globalThis.__iaActionablesExpandState = expandState;
  }

  let k = String(key || '');
  if(!k) return;
  if(expandState.has(k)) {
    expandState.delete(k);
  } else {
    expandState.add(k);
  }
  renderIAPanelResumen();
  renderIAPanelSemanal();
  renderIAPanelQuincena();
}

function toggleExpandIACard(key) {
  let expandState = globalThis.__iaCardsExpandState;
  if(!(expandState instanceof Set)) {
    expandState = new Set();
    globalThis.__iaCardsExpandState = expandState;
  }

  let k = String(key || '');
  if(!k) return;
  if(expandState.has(k)) {
    expandState.delete(k);
  } else {
    expandState.add(k);
  }

  renderIAPanelResumen();
  renderIAPanelSemanal();
  renderIAPanelQuincena();
  renderIAPanelDeudas();
}

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
        throw new Error(detalleHttp ? `HTTP ${resp.status} in AI gateway: ${detalleHttp}` : `HTTP ${resp.status} in AI gateway`);
      }

      let data = await resp.json();
      let parsed = parsearRespuestaGatewayIA(data);
      if(!parsed.message) throw new Error('AI gateway did not return usable text.');

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
  if(!preview) return 'Preview unavailable.';
  let tramoTxt = '';
  if(preview.tramoAntes && preview.tramoDespues) {
    if(preview.tramoAntes.id === preview.tramoDespues.id) {
      tramoTxt = ` · ${preview.tramoAntes.codigo}: ${formatCOP(preview.tramoAntes.saldo)} -> ${formatCOP(preview.tramoDespues.saldo)}`;
    } else {
      tramoTxt = ` · ${preview.tramoAntes.codigo}/${preview.tramoDespues.codigo}: ${formatCOP(preview.tramoAntes.saldo)} -> ${formatCOP(preview.tramoDespues.saldo)}`;
    }
  }
  return `Pending month: ${formatCOP(preview.pendienteMesAntes)} -> ${formatCOP(preview.pendienteMesDespues)}${tramoTxt}`;
}

function construirTextoConfirmacionAccionIA(accion, nombre, preview) {
  let cab = `${etiquetaAccionRecorte(accion.accion)}: ${nombre}`;
  let detalle = construirTextoPreviewAccionIA(preview);
  let motivo = accion.motivo ? `\nReason: ${accion.motivo}` : '';
  return `${cab}\n${detalle}${motivo}\n\nApply change?`;
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
  let out = { ...comp };
  out.diaPagoReal = comp.diaPagoReal === undefined ? null : comp.diaPagoReal;
  out.pagado = !!comp.pagado;
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
    recortes.error = '';
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
  if(accion === 'mover_tramo') return 'Move segment';
  if(accion === 'posponer') return 'Postpone';
  return 'Reduce amount';
}
