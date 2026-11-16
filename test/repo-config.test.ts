import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';

const root = new URL('../', import.meta.url);
const readJson = (name: string) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));

// Every module specifier a file imports or re-exports: `import x from 'a'`, multi-line
// `import {\n a\n} from 'b'`, bare side-effect `import 'c'`, `export * from 'd'`, `export * as n from 'd'`
// and `export { e } from 'f'`. Statements may be indented. Block and line comments are blanked first, so
// commented-out imports are ignored. A line comment starts at `//` at the start of a line or after
// whitespace, so a `://` inside a string is left alone. Lazy `[^'"]*?` spans newlines and stops at the first quote.
function importSpecifiers(text: string): string[] {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  const re = /^[ \t]*(?:import\s+(?:[^'"]*?\s+from\s+)?|export\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+)['"]([^'"]+)['"]/gm;
  return [...code.matchAll(re)].map((m) => m[1]);
}

test('importSpecifiers catches single-line, multi-line and side-effect imports', () => {
  // Built from joined strings so this file's own scan does not see a real import line here.
  const src = [
    "import a from 'single';",
    "import {",
    "  b,",
    "  c",
    "} from 'multi/line';",
    "import 'side-effect-pkg';",
    "import type { D } from '@scope/pkg/sub';",
    "const note = 'import not-at-line-start from nowhere';",
  ].join('\n');
  assert.deepEqual(importSpecifiers(src), ['single', 'multi/line', 'side-effect-pkg', '@scope/pkg/sub']);
});

test('importSpecifiers catches re-exports and indented imports', () => {
  const src = [
    "export * from 'star-pkg';",
    "export * as ns from 'star-as-pkg';",
    "export { a, b } from 'named-pkg';",
    "export type { T } from 'type-pkg';",
    "export {",
    "  x,",
    "} from 'multi-export-pkg';",
    "  import indented from 'indented-pkg';",
    "\timport 'tab-side-effect';",
    "export const local = 1;",
    "export { local as renamed };",
  ].join('\n');
  assert.deepEqual(importSpecifiers(src), [
    'star-pkg',
    'star-as-pkg',
    'named-pkg',
    'type-pkg',
    'multi-export-pkg',
    'indented-pkg',
    'tab-side-effect',
  ]);
});

test('importSpecifiers ignores imports inside block and line comments', () => {
  // The comment markers are joined from pieces so this file's own scan does not see a comment here.
  const open = '/' + '*';
  const close = '*' + '/';
  const slashes = '/' + '/';
  const src = [
    `${open} import a from 'in-block-comment'; ${close}`,
    `${open}`,
    `import b from 'in-multiline-block';`,
    `export * from 'export-in-block';`,
    `${close}`,
    `${slashes} import c from 'in-line-comment';`,
    `  ${slashes} export * from 'indented-line-comment';`,
    `import real from 'real-pkg'; ${slashes} import d from 'trailing-comment';`,
  ].join('\n');
  assert.deepEqual(importSpecifiers(src), ['real-pkg']);
});

test('tests are type-checked: tsconfig.test.json includes test/ and src/', () => {
  const cfg = readJson('tsconfig.test.json');
  assert.ok(cfg.include.includes('test/**/*'), 'test/**/* missing from tsconfig.test.json include');
  assert.ok(cfg.include.includes('src/**/*'), 'src/**/* missing from tsconfig.test.json include');
});

test('every package a test imports is declared in package.json', () => {
  const pkg = readJson('package.json');
  const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
  const missing: string[] = [];
  for (const file of readdirSync(new URL('test/', root)).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(new URL(`test/${file}`, root), 'utf8');
    for (const spec of importSpecifiers(text)) {
      if (spec.startsWith('.') || spec.startsWith('node:') || builtinModules.includes(spec)) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!declared.has(name)) missing.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(missing, [], 'imported but not declared in package.json');
});
