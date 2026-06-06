(function(globalScope) {
  const FIELD_LABELS = {
    ingresosList: 'ingresos',
    compromisos: 'deudas',
    primasList: 'primas',
    valor: 'valor',
    nombre: 'nombre',
    periodo: 'periodo',
    diaPago: 'día de pago',
    mesInicio: 'mes inicial',
    mesFin: 'mes final',
    dia: 'día',
    mesKey: 'mes',
    pagado: 'pagado'
  };

  function formatChangedValue(value, formatCurrency) {
    if(value === null || value === undefined) return 'sin valor';
    if(typeof value === 'number') return typeof formatCurrency === 'function' ? formatCurrency(value) : String(value);
    if(typeof value === 'boolean') return value ? 'sí' : 'no';
    if(typeof value === 'string') return value.trim() ? value.trim() : 'vacío';
    if(Array.isArray(value)) return `lista (${value.length} items)`;
    if(typeof value === 'object') {
      if(value.nombre) return String(value.nombre);
      return 'objeto';
    }
    return String(value);
  }

  function getFieldLabel(field) {
    return FIELD_LABELS[field] || field;
  }

  function buildChangeLabel(pathParts, field, remoteValue, localValue) {
    let name = '';
    if(localValue && typeof localValue === 'object' && localValue.nombre) name = String(localValue.nombre);
    if(!name && remoteValue && typeof remoteValue === 'object' && remoteValue.nombre) name = String(remoteValue.nombre);
    if(name) return `${name} · ${getFieldLabel(field)}`;
    return [...pathParts, getFieldLabel(field)].map(getFieldLabel).join(' > ');
  }

  function collectDriveSyncChanges(remoteValue, localValue, options = {}) {
    const {
      pathParts = [],
      changes = [],
      limit = 8,
      formatCurrency
    } = options;

    if(changes.length >= limit) return changes;
    if(Object.is(remoteValue, localValue)) return changes;

    if(!remoteValue || !localValue || typeof remoteValue !== 'object' || typeof localValue !== 'object') {
      changes.push(`${pathParts.map(getFieldLabel).join(' > ') || 'dato'}: ${formatChangedValue(remoteValue, formatCurrency)} → ${formatChangedValue(localValue, formatCurrency)}`);
      return changes;
    }

    if(Array.isArray(remoteValue) || Array.isArray(localValue)) {
      const remoteArray = Array.isArray(remoteValue) ? remoteValue : [];
      const localArray = Array.isArray(localValue) ? localValue : [];
      const max = Math.max(remoteArray.length, localArray.length);
      for(let index = 0; index < max && changes.length < limit; index += 1) {
        const remoteItem = remoteArray[index];
        const localItem = localArray[index];
        if(remoteItem && localItem && typeof remoteItem === 'object' && typeof localItem === 'object') {
          collectDriveSyncChanges(remoteItem, localItem, {
            pathParts: [...pathParts, `${getFieldLabel(pathParts[pathParts.length - 1] || 'item')} ${index + 1}`],
            changes,
            limit,
            formatCurrency
          });
        } else if(!Object.is(remoteItem, localItem)) {
          const name = (localItem && localItem.nombre) || (remoteItem && remoteItem.nombre) || `${getFieldLabel(pathParts[pathParts.length - 1] || 'item')} ${index + 1}`;
          changes.push(`${name}: ${formatChangedValue(remoteItem, formatCurrency)} → ${formatChangedValue(localItem, formatCurrency)}`);
        }
      }
      return changes;
    }

    const keys = Array.from(new Set([...Object.keys(remoteValue), ...Object.keys(localValue)]));
    for(let key of keys) {
      if(changes.length >= limit) break;
      const remoteChild = remoteValue[key];
      const localChild = localValue[key];
      if(Object.is(remoteChild, localChild)) continue;
      if(remoteChild && localChild && typeof remoteChild === 'object' && typeof localChild === 'object') {
        collectDriveSyncChanges(remoteChild, localChild, {
          pathParts: [...pathParts, getFieldLabel(key)],
          changes,
          limit,
          formatCurrency
        });
      } else {
        changes.push(`${buildChangeLabel(pathParts, key, remoteValue, localValue)}: ${formatChangedValue(remoteChild, formatCurrency)} → ${formatChangedValue(localChild, formatCurrency)}`);
      }
    }

    return changes;
  }

  globalScope.FinancialDriveSyncChangeSummary = {
    formatChangedValue,
    getFieldLabel,
    buildChangeLabel,
    collectDriveSyncChanges
  };
})(window);
