import { HistoricalNewsEvent, NewsCategory, NewsSentiment } from '../model/types';
import newsData from './news.json';

const allNews: HistoricalNewsEvent[] = newsData as HistoricalNewsEvent[];

export function getAllHistoricalNews(): HistoricalNewsEvent[] {
  return [...allNews];
}

export function getNewsUpToDate(date: string): HistoricalNewsEvent[] {
  if (typeof date !== 'string') return [];
  return allNews.filter((n) => n.date <= date);
}

export function getNewsByDate(date: string): HistoricalNewsEvent[] {
  if (typeof date !== 'string') return [];
  return allNews.filter((n) => n.date === date);
}

export interface NewsFilterOptions {
  category?: NewsCategory | 'all';
  sentiment?: NewsSentiment | 'all';
  ticker?: string;
  query?: string;
}

export function filterNewsEvents(
  events: HistoricalNewsEvent[],
  options: NewsFilterOptions
): HistoricalNewsEvent[] {
  if (!Array.isArray(events)) return [];
  if (!options || typeof options !== 'object') return [...events];
  const cat = typeof options.category === 'string' ? options.category.trim().toLowerCase() : undefined;
  const sent = typeof options.sentiment === 'string' ? options.sentiment.trim().toLowerCase() : undefined;
  const ticker = typeof options.ticker === 'string' ? options.ticker.trim().toUpperCase() : undefined;
  const query = typeof options.query === 'string' ? options.query.trim().toLowerCase() : undefined;
  return events.filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const catVal = typeof item.category === 'string' ? item.category.toLowerCase() : '';
    const sentVal = typeof item.sentiment === 'string' ? item.sentiment.toLowerCase() : '';
    const tickers = Array.isArray(item.affectedTickers) ? item.affectedTickers : [];
    const headline = typeof item.headline === 'string' ? item.headline : '';
    const summary = typeof item.summary === 'string' ? item.summary : '';
    if (cat && cat !== 'all' && catVal !== cat) {
      return false;
    }
    if (sent && sent !== 'all' && sentVal !== sent) {
      return false;
    }
    if (ticker && !tickers.map((t) => String(t).toUpperCase()).includes(ticker)) {
      return false;
    }
    if (query) {
      const q = query;
      const matchHead = headline.toLowerCase().includes(q);
      const matchSumm = summary.toLowerCase().includes(q);
      const matchTicker = tickers.some((t) => String(t).toLowerCase().includes(q));
      if (!matchHead && !matchSumm && !matchTicker) {
        return false;
      }
    }
    return true;
  });
}
