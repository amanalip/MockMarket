import { TickerInfo } from './types';

export const CORE_TICKERS: TickerInfo[] = [
  // Technology
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics', assetType: 'stock', marketCap: 3450000000000, peRatio: 33.5, dividendYield: 0.55 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software - Infrastructure', assetType: 'stock', marketCap: 3100000000000, peRatio: 35.2, dividendYield: 0.72 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Content & Information', assetType: 'stock', marketCap: 2150000000000, peRatio: 24.1, dividendYield: 0.45 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors', assetType: 'stock', marketCap: 3050000000000, peRatio: 52.8, dividendYield: 0.03 },
  { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Internet Content & Information', assetType: 'stock', marketCap: 1420000000000, peRatio: 26.7, dividendYield: 0.38 },
  { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors', assetType: 'stock', marketCap: 780000000000, peRatio: 38.4, dividendYield: 1.35 },
  { ticker: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Technology', industry: 'Communication Equipment', assetType: 'stock', marketCap: 230000000000, peRatio: 18.2, dividendYield: 3.12 },
  { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', industry: 'Software - Infrastructure', assetType: 'stock', marketCap: 360000000000, peRatio: 34.1, dividendYield: 1.15 },
  { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', industry: 'Software - Application', assetType: 'stock', marketCap: 280000000000, peRatio: 45.2, dividendYield: 0.52 },
  { ticker: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', industry: 'Software - Application', assetType: 'stock', marketCap: 220000000000, peRatio: 39.8, dividendYield: 0.00 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', industry: 'Semiconductors', assetType: 'stock', marketCap: 240000000000, peRatio: 48.6, dividendYield: 0.00 },
  { ticker: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors', assetType: 'stock', marketCap: 95000000000, peRatio: 32.1, dividendYield: 1.85 },
  { ticker: 'QCOM', name: 'Qualcomm Inc.', sector: 'Technology', industry: 'Semiconductors', assetType: 'stock', marketCap: 190000000000, peRatio: 19.5, dividendYield: 1.98 },
  { ticker: 'TXN', name: 'Texas Instruments', sector: 'Technology', industry: 'Semiconductors', assetType: 'stock', marketCap: 185000000000, peRatio: 31.4, dividendYield: 2.70 },
  { ticker: 'IBM', name: 'International Business Machines', sector: 'Technology', industry: 'Information Technology Services', assetType: 'stock', marketCap: 195000000000, peRatio: 22.3, dividendYield: 3.42 },

  // Consumer Discretionary
  { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', industry: 'Internet Retail', assetType: 'stock', marketCap: 1950000000000, peRatio: 42.1, dividendYield: 0.00 },
  { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', industry: 'Auto Manufacturers', assetType: 'stock', marketCap: 710000000000, peRatio: 64.3, dividendYield: 0.00 },
  { ticker: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer Discretionary', industry: 'Home Improvement Retail', assetType: 'stock', marketCap: 385000000000, peRatio: 25.4, dividendYield: 2.38 },
  { ticker: 'MCD', name: "McDonald's Corporation", sector: 'Consumer Discretionary', industry: 'Restaurants', assetType: 'stock', marketCap: 215000000000, peRatio: 24.8, dividendYield: 2.25 },
  { ticker: 'NKE', name: 'NIKE Inc.', sector: 'Consumer Discretionary', industry: 'Footwear & Accessories', assetType: 'stock', marketCap: 125000000000, peRatio: 27.6, dividendYield: 1.82 },
  { ticker: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Discretionary', industry: 'Restaurants', assetType: 'stock', marketCap: 110000000000, peRatio: 26.1, dividendYield: 2.45 },
  { ticker: 'LOW', name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', industry: 'Home Improvement Retail', assetType: 'stock', marketCap: 155000000000, peRatio: 20.8, dividendYield: 1.78 },
  { ticker: 'TJX', name: 'The TJX Companies Inc.', sector: 'Consumer Discretionary', industry: 'Apparel Retail', assetType: 'stock', marketCap: 130000000000, peRatio: 28.3, dividendYield: 1.25 },
  { ticker: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Consumer Discretionary', industry: 'Travel Services', assetType: 'stock', marketCap: 145000000000, peRatio: 29.5, dividendYield: 0.85 },
  { ticker: 'TGT', name: 'Target Corporation', sector: 'Consumer Discretionary', industry: 'Discount Stores', assetType: 'stock', marketCap: 65000000000, peRatio: 16.2, dividendYield: 2.95 },

  // Financials
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', industry: 'Diversified Banks', assetType: 'stock', marketCap: 620000000000, peRatio: 12.4, dividendYield: 2.20 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc.', sector: 'Financials', industry: 'Insurance - Diversified', assetType: 'stock', marketCap: 990000000000, peRatio: 21.2, dividendYield: 0.00 },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', industry: 'Credit Services', assetType: 'stock', marketCap: 560000000000, peRatio: 30.1, dividendYield: 0.75 },
  { ticker: 'MA', name: 'Mastercard Inc.', sector: 'Financials', industry: 'Credit Services', assetType: 'stock', marketCap: 440000000000, peRatio: 33.8, dividendYield: 0.58 },
  { ticker: 'BAC', name: 'Bank of America Corp', sector: 'Financials', industry: 'Diversified Banks', assetType: 'stock', marketCap: 310000000000, peRatio: 13.1, dividendYield: 2.65 },
  { ticker: 'WFC', name: 'Wells Fargo & Company', sector: 'Financials', industry: 'Diversified Banks', assetType: 'stock', marketCap: 205000000000, peRatio: 12.8, dividendYield: 2.75 },
  { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financials', industry: 'Capital Markets', assetType: 'stock', marketCap: 165000000000, peRatio: 16.5, dividendYield: 3.45 },
  { ticker: 'GS', name: 'The Goldman Sachs Group', sector: 'Financials', industry: 'Capital Markets', assetType: 'stock', marketCap: 160000000000, peRatio: 15.2, dividendYield: 2.45 },
  { ticker: 'BLK', name: 'BlackRock Inc.', sector: 'Financials', industry: 'Asset Management', assetType: 'stock', marketCap: 140000000000, peRatio: 23.4, dividendYield: 2.15 },
  { ticker: 'AXP', name: 'American Express Company', sector: 'Financials', industry: 'Credit Services', assetType: 'stock', marketCap: 185000000000, peRatio: 19.8, dividendYield: 1.10 },

  // Healthcare
  { ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare', industry: 'Drug Manufacturers - General', assetType: 'stock', marketCap: 840000000000, peRatio: 65.4, dividendYield: 0.60 },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Healthcare Plans', assetType: 'stock', marketCap: 520000000000, peRatio: 28.2, dividendYield: 1.45 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Drug Manufacturers - General', assetType: 'stock', marketCap: 395000000000, peRatio: 17.5, dividendYield: 3.05 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Drug Manufacturers - General', assetType: 'stock', marketCap: 330000000000, peRatio: 21.6, dividendYield: 3.35 },
  { ticker: 'MRK', name: 'Merck & Co. Inc.', sector: 'Healthcare', industry: 'Drug Manufacturers - General', assetType: 'stock', marketCap: 290000000000, peRatio: 19.8, dividendYield: 2.85 },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'Healthcare', industry: 'Diagnostics & Research', assetType: 'stock', marketCap: 210000000000, peRatio: 33.1, dividendYield: 0.28 },
  { ticker: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare', industry: 'Medical Devices', assetType: 'stock', marketCap: 200000000000, peRatio: 26.4, dividendYield: 1.95 },
  { ticker: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Drug Manufacturers - General', assetType: 'stock', marketCap: 165000000000, peRatio: 15.2, dividendYield: 5.75 },
  { ticker: 'DHR', name: 'Danaher Corporation', sector: 'Healthcare', industry: 'Diagnostics & Research', assetType: 'stock', marketCap: 180000000000, peRatio: 32.5, dividendYield: 0.42 },
  { ticker: 'BMY', name: 'Bristol-Myers Squibb', sector: 'Healthcare', industry: 'Drug Manufacturers - General', assetType: 'stock', marketCap: 105000000000, peRatio: 14.1, dividendYield: 4.80 },

  // Communication Services
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', industry: 'Entertainment', assetType: 'stock', marketCap: 300000000000, peRatio: 41.5, dividendYield: 0.00 },
  { ticker: 'DIS', name: 'The Walt Disney Company', sector: 'Communication Services', industry: 'Entertainment', assetType: 'stock', marketCap: 175000000000, peRatio: 35.8, dividendYield: 0.95 },
  { ticker: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services', industry: 'Telecom Services', assetType: 'stock', marketCap: 155000000000, peRatio: 10.5, dividendYield: 3.10 },
  { ticker: 'VZ', name: 'Verizon Communications', sector: 'Communication Services', industry: 'Telecom Services', assetType: 'stock', marketCap: 175000000000, peRatio: 9.8, dividendYield: 6.45 },
  { ticker: 'T', name: 'AT&T Inc.', sector: 'Communication Services', industry: 'Telecom Services', assetType: 'stock', marketCap: 140000000000, peRatio: 8.9, dividendYield: 5.70 },

  // Consumer Staples
  { ticker: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', industry: 'Discount Stores', assetType: 'stock', marketCap: 610000000000, peRatio: 32.4, dividendYield: 1.10 },
  { ticker: 'PG', name: 'The Procter & Gamble Company', sector: 'Consumer Staples', industry: 'Household & Personal Products', assetType: 'stock', marketCap: 400000000000, peRatio: 26.8, dividendYield: 2.35 },
  { ticker: 'COST', name: 'Costco Wholesale Corp', sector: 'Consumer Staples', industry: 'Discount Stores', assetType: 'stock', marketCap: 390000000000, peRatio: 51.2, dividendYield: 0.52 },
  { ticker: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples', industry: 'Beverages - Non-Alcoholic', assetType: 'stock', marketCap: 280000000000, peRatio: 25.1, dividendYield: 2.95 },
  { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', industry: 'Beverages - Non-Alcoholic', assetType: 'stock', marketCap: 240000000000, peRatio: 24.2, dividendYield: 3.15 },
  { ticker: 'PM', name: 'Philip Morris International', sector: 'Consumer Staples', industry: 'Tobacco', assetType: 'stock', marketCap: 185000000000, peRatio: 19.4, dividendYield: 4.45 },
  { ticker: 'MDLZ', name: 'Mondelez International', sector: 'Consumer Staples', industry: 'Confectioners', assetType: 'stock', marketCap: 95000000000, peRatio: 21.0, dividendYield: 2.65 },

  // Energy
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas Integrated', assetType: 'stock', marketCap: 470000000000, peRatio: 14.1, dividendYield: 3.25 },
  { ticker: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas Integrated', assetType: 'stock', marketCap: 280000000000, peRatio: 14.8, dividendYield: 4.25 },
  { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy', industry: 'Oil & Gas E&P', assetType: 'stock', marketCap: 130000000000, peRatio: 12.9, dividendYield: 3.10 },
  { ticker: 'SLB', name: 'Schlumberger Limited', sector: 'Energy', industry: 'Oil & Gas Equipment & Services', assetType: 'stock', marketCap: 65000000000, peRatio: 14.5, dividendYield: 2.30 },

  // Industrials
  { ticker: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', industry: 'Farm & Heavy Construction Machinery', assetType: 'stock', marketCap: 175000000000, peRatio: 17.8, dividendYield: 1.55 },
  { ticker: 'GE', name: 'GE Aerospace', sector: 'Industrials', industry: 'Aerospace & Defense', assetType: 'stock', marketCap: 190000000000, peRatio: 33.2, dividendYield: 0.65 },
  { ticker: 'UNP', name: 'Union Pacific Corporation', sector: 'Industrials', industry: 'Railroads', assetType: 'stock', marketCap: 150000000000, peRatio: 22.8, dividendYield: 2.15 },
  { ticker: 'HON', name: 'Honeywell International', sector: 'Industrials', industry: 'Conglomerates', assetType: 'stock', marketCap: 140000000000, peRatio: 24.1, dividendYield: 2.05 },
  { ticker: 'RTX', name: 'RTX Corporation', sector: 'Industrials', industry: 'Aerospace & Defense', assetType: 'stock', marketCap: 160000000000, peRatio: 28.5, dividendYield: 2.10 },
  { ticker: 'BA', name: 'The Boeing Company', sector: 'Industrials', industry: 'Aerospace & Defense', assetType: 'stock', marketCap: 100000000000, peRatio: -18.2, dividendYield: 0.00 },
  { ticker: 'LMT', name: 'Lockheed Martin Corporation', sector: 'Industrials', industry: 'Aerospace & Defense', assetType: 'stock', marketCap: 135000000000, peRatio: 20.4, dividendYield: 2.30 },
  { ticker: 'UPS', name: 'United Parcel Service', sector: 'Industrials', industry: 'Integrated Freight & Logistics', assetType: 'stock', marketCap: 115000000000, peRatio: 19.5, dividendYield: 4.85 },

  // Major ETFs
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'ETF', industry: 'Broad Market Blend', assetType: 'etf', marketCap: 560000000000, peRatio: 27.5, dividendYield: 1.25 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'ETF', industry: 'Tech Heavy Large Cap', assetType: 'etf', marketCap: 280000000000, peRatio: 31.2, dividendYield: 0.58 },
  { ticker: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', sector: 'ETF', industry: 'Large Cap Value', assetType: 'etf', marketCap: 35000000000, peRatio: 22.4, dividendYield: 1.65 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', sector: 'ETF', industry: 'Small Cap Blend', assetType: 'etf', marketCap: 68000000000, peRatio: 23.8, dividendYield: 1.20 },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', sector: 'ETF', industry: 'Total Market', assetType: 'etf', marketCap: 410000000000, peRatio: 26.8, dividendYield: 1.30 },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', sector: 'ETF', industry: 'Large Cap Blend', assetType: 'etf', marketCap: 490000000000, peRatio: 27.5, dividendYield: 1.28 },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'ETF', industry: 'Thematic Innovation', assetType: 'etf', marketCap: 6500000000, peRatio: 0, dividendYield: 0.00 },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR Fund', sector: 'ETF', industry: 'Financial Sector', assetType: 'etf', marketCap: 42000000000, peRatio: 16.5, dividendYield: 1.55 },
  { ticker: 'XLK', name: 'Technology Select Sector SPDR Fund', sector: 'ETF', industry: 'Tech Sector', assetType: 'etf', marketCap: 70000000000, peRatio: 33.4, dividendYield: 0.65 },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund', sector: 'ETF', industry: 'Energy Sector', assetType: 'etf', marketCap: 36000000000, peRatio: 13.8, dividendYield: 3.15 },
  { ticker: 'XLV', name: 'Health Care Select Sector SPDR Fund', sector: 'ETF', industry: 'Healthcare Sector', assetType: 'etf', marketCap: 40000000000, peRatio: 22.0, dividendYield: 1.50 },
  { ticker: 'GLD', name: 'SPDR Gold Shares', sector: 'ETF', industry: 'Precious Metals', assetType: 'etf', marketCap: 68000000000, peRatio: 0, dividendYield: 0.00 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', sector: 'ETF', industry: 'Government Bonds', assetType: 'etf', marketCap: 55000000000, peRatio: 0, dividendYield: 3.85 },

  // Crypto
  { ticker: 'BTC', name: 'Bitcoin', sector: 'Crypto', industry: 'Digital Currency', assetType: 'crypto', marketCap: 1300000000000, peRatio: 0, dividendYield: 0.00 },
  { ticker: 'ETH', name: 'Ethereum', sector: 'Crypto', industry: 'Smart Contract Platform', assetType: 'crypto', marketCap: 380000000000, peRatio: 0, dividendYield: 0.00 },
];
Object.freeze(CORE_TICKERS);

export function getTickerInfo(ticker: string): TickerInfo | undefined {
  if (typeof ticker !== 'string') return undefined;
  const clean = ticker.trim().toUpperCase();
  if (!clean) return undefined;
  return CORE_TICKERS.find((t) => t.ticker.toUpperCase() === clean);
}

export function getAllSectors(): string[] {
  const set = new Set(CORE_TICKERS.map((t) => t.sector));
  return Array.from(set).sort();
}

export function getAllIndustries(sectorFilter?: string): string[] {
  const clean = typeof sectorFilter === 'string' ? sectorFilter.trim() : '';
  const items = clean
    ? CORE_TICKERS.filter((t) => t.sector.toLowerCase() === clean.toLowerCase())
    : CORE_TICKERS;
  const set = new Set(items.map((t) => t.industry));
  return Array.from(set).sort();
}

export function searchTickers(query: string): TickerInfo[] {
  if (typeof query !== 'string') return [...CORE_TICKERS];
  const q = query.trim().toLowerCase();
  if (!q) return [...CORE_TICKERS];
  return CORE_TICKERS.filter(
    (t) =>
      t.ticker.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.sector.toLowerCase().includes(q) ||
      t.industry.toLowerCase().includes(q)
  );
}
