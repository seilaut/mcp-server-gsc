import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { builtinModules } from 'node:module';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const readJson = (name: string) => JSON.parse(readFileSync(new URL(name, root), 'utf8'));

// Every module specifier a file imports or re-exports, read from TypeScript's own syntax tree, so
// nothing is guessed with regexes: static and multi-line imports, side-effect imports, `export ... from`,
// `export * from`, `export * as n from`, `import x = require('y')`, and dynamic `import('z')` / `require('z')`
// with a string literal. Commented-out code is not in the tree, and a comment opener inside a string,
// template or line comment cannot hide a real import.
// `ts.preProcessFile` was tried first and rejected: TypeScript 5.9.3 returns no specifier for
// `export * as ns from 'x'`.
function importSpecifiers(text: string): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      found.push(node.moduleSpecifier.text);
    } else if (ts.isExternalModuleReference(node) && ts.isStringLiteralLike(node.expression)) {
      found.push(node.expression.text);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) {
        found.push(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile('scan.ts', text, ts.ScriptTarget.Latest, true));
  return found;
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

test('importSpecifiers is not fooled by a comment opener inside a string, template or line comment', () => {
  const open = '/' + '*';
  const close = '*' + '/';
  const slashes = '/' + '/';
  const glob = `**/${'*'}.ts`;
  const cases: Array<[string, string[]]> = [
    ['glob string', [`const g = '${glob}';`, "import a from 'after-glob';", `${open}* doc ${close}`]],
    ['line comment', [`${slashes} see ${open} here`, "import b from 'after-line-comment';", `${open} later ${close}`]],
    ['template literal', [`const t = \`${open} not a comment\`;`, "import c from 'after-template';", `${open} later ${close}`]],
  ];
  const expected: Record<string, string> = {
    'glob string': 'after-glob',
    'line comment': 'after-line-comment',
    'template literal': 'after-template',
  };
  for (const [name, lines] of cases) {
    assert.deepEqual(importSpecifiers(lines.join('\n')), [expected[name]], name);
  }
});

test('importSpecifiers catches dynamic import() and ignores export without from', () => {
  const src = ["const m = await import('dynamic-pkg');", 'export const x = 1;'].join('\n');
  assert.deepEqual(importSpecifiers(src), ['dynamic-pkg']);
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
