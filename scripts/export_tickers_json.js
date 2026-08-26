import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDataDir = path.resolve(__dirname, '../public/data');
const tickersFilePath = path.join(publicDataDir, 'tickers.json');

// Read tickers from src/model/tickers.ts
const tickersTsPath = path.resolve(__dirname, '../src/model/tickers.ts');
const content = fs.readFileSync(tickersTsPath, 'utf8');

// Match CORE_TICKERS array contents
const arrayMatch = content.match(/export const CORE_TICKERS: TickerInfo\[] = (\[[\s\S]*?\]);/);
if (arrayMatch) {
  // Evaluated or parsed
  const parsed = eval(arrayMatch[1]);
  fs.writeFileSync(tickersFilePath, JSON.stringify(parsed, null, 2));
  console.log(`Saved ${parsed.length} tickers to ${tickersFilePath}`);
}
