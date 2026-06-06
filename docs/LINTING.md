# Linting Guide

## Objetivo

Standardize JavaScript quality checks with low friction in a modular legacy codebase.

## Stack

- ESLint (flat config): `eslint.config.mjs`
- Reglas base: `@eslint/js` (`recommended`)
- Globals: navegador + Node (`globals`)

## Comandos

- `npm run lint`: runs lint checks across the repository.
- `npm run lint:fix`: applies safe auto-fixes when ESLint supports them.

## Current conventions

- `sourceType` is not unique across the project: legacy/global files run as `script`, `*.mjs` files run as `module`, and tests use the Node-oriented `sourceType` defined in ESLint configuration.
- `no-undef` stays disabled to avoid false positives from global cross-file legacy functions.
- `no-unused-vars` and `no-empty` remain warnings to surface technical debt without blocking delivery.

## File size guardrail

- Target size for new files: 300 lines or fewer.
- Review threshold: when a file exceeds 500 lines, the PR must explicitly consider whether cohesive logic can move to a module under `src/app/`, an existing split file, or a new domain file.
- Legacy exception threshold: files over 1,000 lines are allowed only while actively being reduced; any substantial change in those files should either extract a cohesive block or document why extraction is unsafe.
- Avoid adding unrelated responsibilities to files already above the review threshold.

## Criterio de uso en PR

1. Run `npm run lint` before push.
2. Fix new errors immediately.
3. If new warnings appear, document them in the PR or resolve them when the change allows it.

## Known technical debt

The first sweep reports legacy warnings (unused variables and empty blocks). They are temporarily accepted to avoid blocking functional delivery, but they should be reduced module by module in refactor tickets.
