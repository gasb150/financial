const fs = require('node:fs');
const vm = require('node:vm');

function extractFunctionFromSource(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Function not found: ${functionName}`);
  }

  const paramsStart = source.indexOf('(', start);
  if (paramsStart < 0) {
    throw new Error(`Function params not found: ${functionName}`);
  }

  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '(') paramsDepth += 1;
    if (ch === ')') {
      paramsDepth -= 1;
      if (paramsDepth === 0) {
        paramsEnd = i;
        break;
      }
    }
  }

  if (paramsEnd < 0) {
    throw new Error(`Function params end not found: ${functionName}`);
  }

  const bodyStart = source.indexOf('{', paramsEnd);
  if (bodyStart < 0) {
    throw new Error(`Function body not found: ${functionName}`);
  }

  let depth = 0;
  let end = -1;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error(`Function end not found: ${functionName}`);
  }

  return source.slice(start, end + 1);
}

function loadFunctionsFromFile(filePath, functionNames, sandbox = {}) {
  const source = fs.readFileSync(filePath, 'utf8');
  const ctx = {
    ...sandbox,
    console,
    Number,
    Math,
    JSON,
    String,
    parseInt,
    parseFloat,
    isNaN,
    Date,
    Set,
    Array,
    Object
  };

  for (const fnName of functionNames) {
    const fnCode = extractFunctionFromSource(source, fnName);
    const wrapped = `${fnCode}\nthis.${fnName} = ${fnName};`;
    vm.runInNewContext(wrapped, ctx, { filename: filePath });
  }

  return ctx;
}

module.exports = {
  extractFunctionFromSource,
  loadFunctionsFromFile
};
