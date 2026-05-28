const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const APP_IA_JS = path.join(ROOT, 'app.ia.js');

function loadIAContext(sandbox = {}) {
  const source = fs.readFileSync(APP_IA_JS, 'utf8');
  const ctx = {
    window: {},
    console,
    Date,
    Math,
    JSON,
    String,
    Number,
    parseInt,
    parseFloat,
    isNaN,
    ...sandbox
  };
  vm.runInNewContext(source, ctx, { filename: APP_IA_JS });
  return ctx;
}

test('consultarIALocal reintenta y devuelve respuesta al siguiente intento exitoso', async () => {
  let attempts = 0;

  const ctx = loadIAContext({
    getConfigIALocal: () => ({
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3.1:8b',
      timeoutMs: 1000,
      retries: 1
    }),
    AbortController: class {
      constructor() { this.signal = {}; }
      abort() {}
    },
    setTimeout: (fn) => { return 1; },
    clearTimeout: () => {},
    fetch: async () => {
      attempts += 1;
      if(attempts === 1) throw new TypeError('network');
      return {
        ok: true,
        async json() {
          return { response: 'ok local' };
        }
      };
    }
  });

  const out = await ctx.consultarIALocal('hola');
  assert.equal(attempts, 2);
  assert.equal(out.ok, true);
  assert.equal(out.mode, 'local');
  assert.equal(out.message, 'ok local');
});

test('consultarIALocal reporta error claro de conectividad al agotar intentos', async () => {
  const ctx = loadIAContext({
    getConfigIALocal: () => ({
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3.1:8b',
      timeoutMs: 1000,
      retries: 0
    }),
    AbortController: class {
      constructor() { this.signal = {}; }
      abort() {}
    },
    setTimeout: (fn) => { return 1; },
    clearTimeout: () => {},
    fetch: async () => {
      throw new TypeError('network');
    }
  });

  await assert.rejects(
    async () => ctx.consultarIALocal('hola'),
    /No se pudo conectar con IA LOCAL/
  );
});
