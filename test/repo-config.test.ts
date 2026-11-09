import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';

const root = new URL('../', import.meta.url);
const readJson = (name: string) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));

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
    for (const m of text.matchAll(/^import[^'"\n]*from\s+['"]([^'"]+)['"]/gm)) {
      const spec = m[1];
      if (spec.startsWith('.') || spec.startsWith('node:') || builtinModules.includes(spec)) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!declared.has(name)) missing.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(missing, [], 'imported but not declared in package.json');
});
