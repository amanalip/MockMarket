import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDataDir = path.resolve(__dirname, '../public/data');
const stocksDir = path.join(publicDataDir, 'stocks');
const etfsDir = path.join(publicDataDir, 'etfs');
const cryptoDir = path.join(publicDataDir, 'crypto');

[publicDataDir, stocksDir, etfsDir, cryptoDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Seeded PRNG for reproducible, realistic OHLCV generation
function createPRNG(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate calendar dates from 2015-01-02 to 2024-12-31
function getTradingDates(isCrypto = false) {
  const dates = [];
  const start = new Date('2015-01-01');
  const end = new Date('2024-12-31');
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isCrypto || !isWeekend) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Historic anchors per ticker (date -> approximate real close price)
const TICKER_ANCHORS = {
  AAPL: [
    { date: '2015-01-02', price: 27.33 },
    { date: '2016-01-04', price: 26.34 },
    { date: '2017-01-03', price: 29.04 },
    { date: '2018-01-02', price: 43.06 },
    { date: '2019-01-02', price: 39.48 },
    { date: '2020-01-02', price: 75.09 },
    { date: '2020-03-23', price: 56.09 }, // covid low
    { date: '2021-01-04', price: 129.41 },
    { date: '2022-01-03', price: 182.01 },
    { date: '2022-12-30', price: 129.93 }, // 2022 low
    { date: '2023-12-29', price: 192.53 },
    { date: '2024-12-31', price: 250.40 },
  ],
  MSFT: [
    { date: '2015-01-02', price: 46.76 },
    { date: '2016-01-04', price: 54.80 },
    { date: '2017-01-03', price: 62.58 },
    { date: '2018-01-02', price: 85.95 },
    { date: '2019-01-02', price: 101.12 },
    { date: '2020-01-02', price: 160.62 },
    { date: '2020-03-23', price: 135.98 },
    { date: '2021-01-04', price: 217.69 },
    { date: '2022-01-03', price: 334.75 },
    { date: '2022-11-03', price: 214.25 },
    { date: '2023-12-29', price: 376.04 },
    { date: '2024-12-31', price: 421.50 },
  ],
  GOOGL: [
    { date: '2015-01-02', price: 26.48 },
    { date: '2016-01-04', price: 37.97 },
    { date: '2017-01-03', price: 40.40 },
    { date: '2018-01-02', price: 53.66 },
    { date: '2019-01-02', price: 52.73 },
    { date: '2020-01-02', price: 68.43 },
    { date: '2020-03-23', price: 52.84 },
    { date: '2021-01-04', price: 86.41 },
    { date: '2021-11-19', price: 149.84 },
    { date: '2022-11-03', price: 83.43 },
    { date: '2023-12-29', price: 139.69 },
    { date: '2024-12-31', price: 189.60 },
  ],
  AMZN: [
    { date: '2015-01-02', price: 15.43 },
    { date: '2016-01-04', price: 31.80 },
    { date: '2017-01-03', price: 37.68 },
    { date: '2018-01-02', price: 59.45 },
    { date: '2019-01-02', price: 76.95 },
    { date: '2020-01-02', price: 94.90 },
    { date: '2020-03-23', price: 95.10 },
    { date: '2020-09-02', price: 176.57 },
    { date: '2021-07-08', price: 186.57 },
    { date: '2022-12-28', price: 81.82 },
    { date: '2023-12-29', price: 151.94 },
    { date: '2024-12-31', price: 218.70 },
  ],
  TSLA: [
    { date: '2015-01-02', price: 14.62 },
    { date: '2016-01-04', price: 14.89 },
    { date: '2017-01-03', price: 14.47 },
    { date: '2018-01-02', price: 21.37 },
    { date: '2019-01-02', price: 20.67 },
    { date: '2019-06-03', price: 11.93 },
    { date: '2020-01-02', price: 28.68 },
    { date: '2020-03-18', price: 24.08 },
    { date: '2021-01-04', price: 243.26 },
    { date: '2021-11-04', price: 409.97 },
    { date: '2023-01-06', price: 113.06 },
    { date: '2023-12-29', price: 248.48 },
    { date: '2024-12-31', price: 403.80 },
  ],
  SPY: [
    { date: '2015-01-02', price: 205.43 },
    { date: '2016-01-04', price: 201.02 },
    { date: '2017-01-03', price: 225.24 },
    { date: '2018-01-02', price: 268.77 },
    { date: '2018-12-24', price: 234.34 },
    { date: '2019-01-02', price: 250.18 },
    { date: '2020-01-02', price: 324.87 },
    { date: '2020-03-23', price: 222.95 },
    { date: '2021-01-04', price: 368.79 },
    { date: '2022-01-03', price: 477.71 },
    { date: '2022-10-12', price: 356.56 },
    { date: '2023-12-29', price: 475.31 },
    { date: '2024-12-31', price: 588.20 },
  ],
  QQQ: [
    { date: '2015-01-02', price: 102.94 },
    { date: '2016-01-04', price: 109.50 },
    { date: '2017-01-03', price: 119.24 },
    { date: '2018-01-02', price: 158.49 },
    { date: '2019-01-02', price: 154.88 },
    { date: '2020-01-02', price: 216.16 },
    { date: '2020-03-23', price: 169.25 },
    { date: '2021-01-04', price: 312.98 },
    { date: '2021-11-19', price: 403.99 },
    { date: '2022-12-28', price: 260.10 },
    { date: '2023-12-29', price: 409.52 },
    { date: '2024-12-31', price: 524.50 },
  ],
  JPM: [
    { date: '2015-01-02', price: 62.49 },
    { date: '2016-01-04', price: 63.62 },
    { date: '2017-01-03', price: 87.23 },
    { date: '2018-01-02', price: 107.95 },
    { date: '2019-01-02', price: 99.31 },
    { date: '2020-01-02', price: 141.09 },
    { date: '2020-03-23', price: 79.03 },
    { date: '2021-01-04', price: 125.75 },
    { date: '2021-10-22', price: 171.78 },
    { date: '2022-10-12', price: 105.79 },
    { date: '2023-12-29', price: 170.10 },
    { date: '2024-12-31', price: 241.30 },
  ],
  BTC: [
    { date: '2015-01-02', price: 314.25 },
    { date: '2016-01-04', price: 433.00 },
    { date: '2017-01-03', price: 1043.84 },
    { date: '2017-12-16', price: 19497.40 },
    { date: '2018-12-15', price: 3236.76 },
    { date: '2019-06-26', price: 13016.23 },
    { date: '2020-03-12', price: 4970.79 },
    { date: '2020-12-31', price: 29001.72 },
    { date: '2021-11-10', price: 68789.63 },
    { date: '2022-11-21', price: 15787.28 },
    { date: '2023-12-29', price: 42099.40 },
    { date: '2024-03-14', price: 73750.07 },
    { date: '2024-12-31', price: 93450.00 },
  ],
  ETH: [
    { date: '2015-08-07', price: 2.77 },
    { date: '2016-01-04', price: 0.95 },
    { date: '2017-01-03', price: 9.68 },
    { date: '2018-01-13', price: 1432.88 },
    { date: '2018-12-15', price: 84.31 },
    { date: '2019-06-26', price: 336.50 },
    { date: '2020-03-12', price: 110.60 },
    { date: '2020-12-31', price: 737.80 },
    { date: '2021-11-16', price: 4891.70 },
    { date: '2022-06-18', price: 993.64 },
    { date: '2023-12-29', price: 2288.33 },
    { date: '2024-12-31', price: 3340.00 },
  ]
};

// Generate piece-wise realistic series through anchors
function generateOHLCV(ticker, isCrypto = false, seed = 12345) {
  const dates = getTradingDates(isCrypto);
  const prng = createPRNG(seed);
  const anchors = TICKER_ANCHORS[ticker] || [
    { date: '2015-01-02', price: 100 },
    { date: '2020-03-23', price: 80 },
    { date: '2021-12-31', price: 160 },
    { date: '2024-12-31', price: 220 },
  ];

  const series = [];
  let currentPrice = anchors[0].price;
  let anchorIdx = 0;

  for (let i = 0; i < dates.length; i++) {
    const dateStr = dates[i];

    // Find bounding anchors
    while (anchorIdx < anchors.length - 1 && dates[i] > anchors[anchorIdx + 1].date) {
      anchorIdx++;
    }

    let targetPrice = anchors[anchorIdx].price;
    if (anchorIdx < anchors.length - 1) {
      const a1 = anchors[anchorIdx];
      const a2 = anchors[anchorIdx + 1];
      const d1 = new Date(a1.date).getTime();
      const d2 = new Date(a2.date).getTime();
      const dCur = new Date(dateStr).getTime();
      const progress = Math.min(1, Math.max(0, (dCur - d1) / (d2 - d1)));
      targetPrice = a1.price + (a2.price - a1.price) * progress;
    }

    // Daily noise and drift toward target
    const dailyDrift = (targetPrice - currentPrice) * 0.08;
    const volatility = isCrypto ? 0.038 : (ticker === 'TSLA' ? 0.028 : 0.015);
    const noise = (prng() - 0.5) * 2 * volatility * currentPrice;

    const open = Math.max(0.1, currentPrice);
    const close = Math.max(0.1, open + dailyDrift + noise);
    
    // High and Low bounds
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const highWick = prng() * volatility * currentPrice * 0.8;
    const lowWick = prng() * volatility * currentPrice * 0.8;
    const high = maxOC + highWick;
    const low = Math.max(0.05, minOC - lowWick);

    // Volume calculation
    const baseVolume = isCrypto ? 25000000 : (ticker === 'SPY' ? 75000000 : 30000000);
    const volumeMultiplier = 0.5 + prng() * 1.0 + (Math.abs(close - open) / open) * 15;
    const volume = Math.round(baseVolume * volumeMultiplier);

    series.push({
      time: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: volume,
    });

    currentPrice = close;
  }

  return series;
}

// Generate for all core tickers
const tickersToGenerate = [
  { ticker: 'AAPL', type: 'stocks', isCrypto: false, seed: 101 },
  { ticker: 'MSFT', type: 'stocks', isCrypto: false, seed: 102 },
  { ticker: 'GOOGL', type: 'stocks', isCrypto: false, seed: 103 },
  { ticker: 'AMZN', type: 'stocks', isCrypto: false, seed: 104 },
  { ticker: 'TSLA', type: 'stocks', isCrypto: false, seed: 105 },
  { ticker: 'JPM', type: 'stocks', isCrypto: false, seed: 106 },
  { ticker: 'SPY', type: 'etfs', isCrypto: false, seed: 107 },
  { ticker: 'QQQ', type: 'etfs', isCrypto: false, seed: 108 },
  { ticker: 'BTC', type: 'crypto', isCrypto: true, seed: 109 },
  { ticker: 'ETH', type: 'crypto', isCrypto: true, seed: 110 },
];

console.log('Generating initial core ticker datasets...');
tickersToGenerate.forEach((item) => {
  const data = generateOHLCV(item.ticker, item.isCrypto, item.seed);
  const filePath = path.join(publicDataDir, item.type, `${item.ticker}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`Saved ${item.ticker} (${data.length} candles) -> ${filePath}`);
});

console.log('Data generation complete.');
