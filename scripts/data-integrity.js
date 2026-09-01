import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTradingDay } from 'us-equity-market-calendar';
import { validateCandles } from '../src/data/candle-validation.js';
import { parseCoreTickers } from './export_tickers_json.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'public/data');
const manifestPath = path.join(dataDir, 'manifest.json');
const catalogPath = path.join(dataDir, 'tickers.json');
const generatorPath = path.join(projectRoot, 'scripts/generate_data.js');
const tickerSourcePath = path.join(projectRoot, 'src/model/tickers.ts');
const ASSET_FOLDERS = { stock: 'stocks', etf: 'etfs', crypto: 'crypto' };
const TICKER_PATTERN = /^[A-Z][A-Z0-9]*(?:\.[A-Z0-9]+)?$/;
const START_DATE = '2015-01-01';
const END_DATE = '2024-12-31';
const AD_HOC_EQUITY_CLOSURES = new Set(['2018-12-05']);

function fail(context, message) {
  throw new Error(`${context}: ${message}`);
}

function parseJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(path.relative(projectRoot, filePath), `invalid JSON (${error instanceof Error ? error.message : String(error)})`);
  }
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function assertSafeDataPath(filePath, allowMissing = false, rootDir = dataDir) {
  const resolvedDataDir = path.resolve(rootDir);
  const resolvedPath = path.resolve(filePath);
  const relative = path.relative(resolvedDataDir, resolvedPath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail(path.relative(projectRoot, resolvedPath), 'path escapes public/data');
  }

  const parts = relative ? relative.split(path.sep) : [];
  let current = resolvedDataDir;
  for (const part of ['', ...parts]) {
    if (part) current = path.join(current, part);
    if (!fs.existsSync(current)) {
      if (allowMissing) continue;
      fail(path.relative(projectRoot, current), 'path does not exist');
    }
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      fail(path.relative(projectRoot, current), 'symbolic links are not allowed in dataset paths');
    }
  }
  return resolvedPath;
}

export function assertCatalogMatchesSource(catalog, sourceCatalog) {
  if (JSON.stringify(sourceCatalog) !== JSON.stringify(catalog)) {
    fail('public/data/tickers.json', 'catalog does not match CORE_TICKERS; run npm run data:export-tickers');
  }
}

function expectedDates(isCrypto) {
  const dates = [];
  const current = new Date(`${START_DATE}T00:00:00.000Z`);
  const end = new Date(`${END_DATE}T00:00:00.000Z`);
  while (current <= end) {
    const date = current.toISOString().slice(0, 10);
    if (isCrypto || (isTradingDay(date) && !AD_HOC_EQUITY_CLOSURES.has(date))) dates.push(date);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

export function validateCatalog(value, context = 'public/data/tickers.json') {
  if (!Array.isArray(value) || value.length === 0) fail(context, 'expected a non-empty array');
  const seen = new Set();
  return value.map((item, index) => {
    const itemContext = `${context}: ticker ${index}`;
    if (item === null || typeof item !== 'object' || Array.isArray(item)) fail(itemContext, 'must be an object');
    for (const field of ['ticker', 'name', 'sector', 'industry']) {
      if (typeof item[field] !== 'string' || item[field].trim() === '') fail(itemContext, `field ${field} must be a non-empty string`);
    }
    if (item.ticker.length > 10 || !TICKER_PATTERN.test(item.ticker)) fail(itemContext, `invalid ticker symbol ${JSON.stringify(item.ticker)}`);
    if (typeof item.assetType !== 'string' || !Object.hasOwn(ASSET_FOLDERS, item.assetType)) {
      fail(itemContext, `invalid assetType ${JSON.stringify(item.assetType)}`);
    }
    if (seen.has(item.ticker)) fail(itemContext, `duplicate ticker ${item.ticker}`);
    seen.add(item.ticker);
    for (const field of ['marketCap', 'peRatio', 'dividendYield']) {
      if (item[field] !== undefined && (typeof item[field] !== 'number' || !Number.isFinite(item[field]))) {
        fail(itemContext, `field ${field} must be finite when present`);
      }
    }
    return item;
  });
}

function validateCalendar(candles, ticker, isCrypto, filePath) {
  const dates = expectedDates(isCrypto);
  if (candles.length !== dates.length) {
    fail(filePath, `${ticker} coverage has ${candles.length} candles; expected ${dates.length} from ${START_DATE} through ${END_DATE}`);
  }
  for (let index = 0; index < dates.length; index++) {
    if (candles[index].time !== dates[index]) {
      fail(filePath, `${ticker} calendar mismatch at candle ${index}: found ${candles[index].time}, expected ${dates[index]}`);
    }
  }
}

export function buildManifest() {
  assertSafeDataPath(catalogPath);
  const catalog = validateCatalog(parseJson(catalogPath));
  const sourceCatalog = validateCatalog(
    parseCoreTickers(fs.readFileSync(tickerSourcePath, 'utf8'), tickerSourcePath),
    'src/model/tickers.ts'
  );
  assertCatalogMatchesSource(catalog, sourceCatalog);
  const expectedFiles = new Set();
  const datasets = [...catalog]
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .map((item) => {
      const relativePath = `public/data/${ASSET_FOLDERS[item.assetType]}/${item.ticker}.json`;
      const filePath = path.join(projectRoot, relativePath);
      expectedFiles.add(path.resolve(filePath));
      if (!fs.existsSync(filePath)) fail(relativePath, `missing dataset for catalog ticker ${item.ticker}`);
      assertSafeDataPath(filePath);
      const candles = validateCandles(parseJson(filePath), relativePath);
      validateCalendar(candles, item.ticker, item.assetType === 'crypto', relativePath);
      return {
        ticker: item.ticker,
        assetType: item.assetType,
        path: relativePath,
        candles: candles.length,
        startDate: candles[0].time,
        endDate: candles.at(-1).time,
        sha256: sha256(filePath),
      };
    });

  for (const folder of Object.values(ASSET_FOLDERS)) {
    const folderPath = path.join(dataDir, folder);
    assertSafeDataPath(folderPath);
    for (const name of fs.readdirSync(folderPath)) {
      if (name.endsWith('.json') && !expectedFiles.has(path.resolve(folderPath, name))) {
        fail(`public/data/${folder}/${name}`, 'dataset is not represented in the ticker catalog');
      }
    }
  }

  return {
    schemaVersion: 1,
    generation: {
      script: 'scripts/generate_data.js',
      sha256: sha256(generatorPath),
      tickerSourceSha256: sha256(tickerSourcePath),
      startDate: START_DATE,
      endDate: END_DATE,
      equityCalendar: 'us-equity-market-calendar@1 with listed ad-hoc closures',
      adHocEquityClosures: [...AD_HOC_EQUITY_CLOSURES].sort(),
    },
    catalog: {
      path: 'public/data/tickers.json',
      tickers: catalog.length,
      sha256: sha256(catalogPath),
    },
    datasets,
  };
}

function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function writeManifest() {
  const contents = serializeManifest(buildManifest());
  assertSafeDataPath(manifestPath, true);
  fs.writeFileSync(manifestPath, contents);
  return manifestPath;
}

export function validateDataIntegrity() {
  const manifest = buildManifest();
  const expected = serializeManifest(manifest);
  if (!fs.existsSync(manifestPath)) fail('public/data/manifest.json', 'missing integrity manifest; run npm run data:manifest');
  assertSafeDataPath(manifestPath);
  const actual = fs.readFileSync(manifestPath, 'utf8');
  if (actual !== expected) fail('public/data/manifest.json', 'does not match catalog/datasets; regenerate intentionally with npm run data:manifest');
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    if (process.argv.includes('--write-manifest')) {
      console.log(`Wrote ${path.relative(projectRoot, writeManifest())}`);
    } else {
      const manifest = validateDataIntegrity();
      console.log(`Validated ${manifest.datasets.length} catalog datasets and deterministic integrity manifest.`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
