// Bundle budget gate. Sums the gzip size of every emitted application
// JavaScript file once and requires the total to stay strictly below the
// limit. Conservative on purpose: vendor and lazy chunks all count.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const SIZE_LIMIT_BYTES = 300_000;
export const DIST_DIR = 'dist';

function jsFilesIn(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

/**
 * @param {string} dir build output directory
 * @param {number} limit strict upper bound in bytes
 * @returns {{files: {path: string, gzip: number}[], total: number, limit: number, ok: boolean}}
 */
export function measure(dir = DIST_DIR, limit = SIZE_LIMIT_BYTES) {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`no build output at ${dir}: run the production build first`);
  }
  const files = jsFilesIn(dir).map((path) => ({
    path,
    gzip: gzipSync(readFileSync(path)).length,
  }));
  if (files.length === 0) {
    throw new Error(`no JavaScript emitted in ${dir}: the build produced nothing to measure`);
  }
  const total = files.reduce((sum, file) => sum + file.gzip, 0);
  return { files, total, limit, ok: total < limit };
}

export function formatReport({ files, total, limit, ok }) {
  const rows = files.map((f) => `  ${f.gzip.toString().padStart(8)}  ${f.path}`);
  const verdict = ok ? 'under budget' : 'OVER BUDGET';
  return [...rows, `  ${'-'.repeat(8)}`, `  ${total.toString().padStart(8)}  total gzipped (limit ${limit}, ${verdict})`].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = measure(process.argv[2] ?? DIST_DIR);
    console.log(formatReport(result));
    if (!result.ok) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
