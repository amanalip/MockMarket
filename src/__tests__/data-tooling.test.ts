import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { parseCoreTickers } from '../../scripts/export_tickers_json.js';
import { resolveOutputPath } from '../../scripts/generate_data.js';
import { assertCatalogMatchesSource, assertSafeDataPath, validateDataIntegrity } from '../../scripts/data-integrity.js';

describe('data tooling safety and integrity', () => {
  it('parses CORE_TICKERS as structured TypeScript literals', () => {
    const parsed = parseCoreTickers(`
      export const CORE_TICKERS: TickerInfo[] = [
        { ticker: 'SAFE', name: 'Safe', assetType: 'stock', marketCap: -1 }
      ];
    `);
    expect(parsed).toEqual([{ ticker: 'SAFE', name: 'Safe', assetType: 'stock', marketCap: -1 }]);
  });

  it('rejects executable syntax rather than evaluating it', () => {
    expect(() => parseCoreTickers('export const CORE_TICKERS = [globalThis.compromised = true];'))
      .toThrow('non-literal syntax');
    expect((globalThis as { compromised?: boolean }).compromised).toBeUndefined();
  });

  it('constrains generated paths to valid catalog ticker symbols', () => {
    const root = path.resolve('/tmp/mockmarket-data-test');
    expect(resolveOutputPath('BRK.B', 'stock', root)).toBe(path.join(root, 'stocks/BRK.B.json'));
    expect(() => resolveOutputPath('../../escape', 'stock', root)).toThrow('Invalid ticker symbol');
    expect(() => resolveOutputPath('SAFE', '../escape', root)).toThrow('Invalid asset type');
  });

  it('rejects symlinks in generated data paths', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mockmarket-data-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mockmarket-outside-'));
    try {
      fs.symlinkSync(outside, path.join(root, 'stocks'));
      expect(() => assertSafeDataPath(path.join(root, 'stocks/SAFE.json'), true, root))
        .toThrow('symbolic links are not allowed');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it('rejects drift between CORE_TICKERS and the public catalog', () => {
    expect(() => assertCatalogMatchesSource(
      [{ ticker: 'AAPL', assetType: 'stock' }],
      [{ ticker: 'AAPL', assetType: 'etf' }]
    )).toThrow('catalog does not match CORE_TICKERS');
  });

  it('rebuilds the committed deterministic manifest exactly', () => {
    const rebuilt = validateDataIntegrity();
    const manifest = JSON.parse(fs.readFileSync('public/data/manifest.json', 'utf8'));
    expect(rebuilt).toEqual(manifest);
    expect(manifest.datasets).toHaveLength(84);
  });
});
