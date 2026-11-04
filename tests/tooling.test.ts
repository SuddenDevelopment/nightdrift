import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { measure, SIZE_LIMIT_BYTES } from '../scripts/size.mjs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
  scripts: Record<string, string>;
};

const temporaryDirs: string[] = [];

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nightdrift-size-'));
  temporaryDirs.push(dir);
  return dir;
}

/** Deterministic, poorly compressible filler so chunk sizes stay distinct. */
function writeJs(dir: string, name: string, chars: number): void {
  let state = 12345;
  let body = '';
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < chars; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648;
    body += alphabet[state % alphabet.length];
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), `const x = "${body}";\n`);
}

afterEach(() => {
  while (temporaryDirs.length) rmSync(temporaryDirs.pop()!, { recursive: true, force: true });
});

describe('package scripts', () => {
  const { scripts } = pkg;

  it('declares all seven quality scripts plus dev', () => {
    for (const name of ['lint', 'typecheck', 'test', 'build', 'test:e2e', 'size', 'verify', 'dev']) {
      expect(scripts[name], `missing script: ${name}`).toBeTruthy();
    }
  });

  it('runs verify fail-fast in the required order', () => {
    const called = [...scripts.verify.matchAll(/npm run ([\w:]+)/g)].map((match) => match[1]);
    expect(called).toEqual(['lint', 'typecheck', 'test', 'build', 'test:e2e', 'size']);
    // && stops on the first non-zero exit; ; would not.
    expect(scripts.verify).not.toContain(';');
  });

  it('pins the package version the application reports', () => {
    expect(pkg.version).toBe('0.1.0');
  });
});

describe('size budget', () => {
  it('defaults to a 300000 byte limit', () => {
    expect(SIZE_LIMIT_BYTES).toBe(300_000);
  });

  it('fails when the build output directory is missing', () => {
    expect(() => measure(join(makeDir(), 'absent'))).toThrow(/no build output/);
  });

  it('fails when the build emitted no JavaScript', () => {
    const dir = makeDir();
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    expect(() => measure(dir)).toThrow(/no JavaScript/);
  });

  it('sums split chunks across nested directories, counting each once', () => {
    const dir = makeDir();
    writeJs(dir, 'entry.js', 1000);
    writeJs(join(dir, 'assets'), 'vendor.js', 2000);
    writeJs(join(dir, 'assets'), 'lazy.js', 500);

    const result = measure(dir);
    expect(result.files).toHaveLength(3);
    expect(result.files.map((file) => file.path)).toHaveLength(new Set(result.files.map((f) => f.path)).size);
    expect(result.total).toBe(result.files.reduce((sum, file) => sum + file.gzip, 0));
    expect(result.total).toBeGreaterThan(0);
  });

  it('ignores non-JavaScript assets', () => {
    const dir = makeDir();
    writeJs(dir, 'entry.js', 1000);
    const jsOnly = measure(dir).total;
    writeFileSync(join(dir, 'style.css'), 'body{color:red}'.repeat(500));
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    expect(measure(dir).total).toBe(jsOnly);
  });

  it('treats the budget as a strict upper bound at every boundary', () => {
    const dir = makeDir();
    writeJs(dir, 'entry.js', 1000);
    const { total } = measure(dir);

    expect(measure(dir, total + 1).ok).toBe(true); // below the limit
    expect(measure(dir, total).ok).toBe(false); // equal to the limit
    expect(measure(dir, total - 1).ok).toBe(false); // above the limit
  });
});
