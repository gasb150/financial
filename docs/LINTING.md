# Linting Guide

## Objetivo

Estandarizar validaciones de calidad para JavaScript con bajo riesgo de fricción en una base legacy modular.

## Stack

- ESLint (flat config): `eslint.config.mjs`
- Reglas base: `@eslint/js` (`recommended`)
- Globals: navegador + Node (`globals`)

## Comandos

- `npm run lint`: ejecuta chequeos de lint en todo el repo
- `npm run lint:fix`: aplica auto-fixes seguros cuando ESLint los soporta

## Convenciones actuales

- El `sourceType` no es único para todo el proyecto: los archivos legacy/globales se evalúan como `script`, los archivos `*.mjs` como `module` y los tests usan el `sourceType` definido para su entorno Node en la configuración de ESLint.
- `no-undef` se mantiene desactivado para evitar falsos positivos por funciones globales cruzadas entre modulos legacy.
- `no-unused-vars` y `no-empty` se mantienen como warning para visibilizar deuda tecnica sin bloquear flujo.

## Criterio de uso en PR

1. Ejecutar `npm run lint` antes de push.
2. Corregir errores nuevos inmediatamente.
3. Si aparecen warnings nuevos, documentarlos en el PR o resolverlos cuando el cambio lo permita.

## Deuda tecnica conocida

El primer barrido reporta warnings de legacy (variables no usadas y bloques vacíos). Se aceptan temporalmente para no bloquear entregas funcionales, pero se recomienda reducirlos por modulo en tickets de refactor.
