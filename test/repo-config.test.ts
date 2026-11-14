import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';

const root = new URL('../', import.meta.url);
const readJson = (name: string) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));

// Every module specifier a file imports: `import x from 'a'`, multi-line `import {\n a\n} from 'b'`,
// and bare side-effect `import 'c'`. Lazy `[^'"]*?` spans newlines, and stops at the first quote.
function importSpecifiers(text: string): string[] {
  return [...text.matchAll(/^import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((m) => m[1]);
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
