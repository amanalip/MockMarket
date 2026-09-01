import React, { useState, useMemo } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { getAllHistoricalNews, filterNewsEvents } from '../../data/news-loader';
import { NewsCategory, NewsSentiment } from '../../model/types';
import { Calendar, Search, ArrowRight } from 'lucide-react';
import { loadTickerData, getLatestCandleOnOrBefore } from '../../data/loader';
import styles from './NewsFeed.module.css';

export const NewsFeed: React.FC = () => {
  const { simulationDate, setSimulationDate, selectedTicker, addToast } = useUIStore();
  const { updateMarketPrices, processCandleForOrders } = usePortfolioStore();

  const [category, setCategory] = useState<NewsCategory | 'all'>('all');
  const [sentiment, setSentiment] = useState<NewsSentiment | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tickerFilter, setTickerFilter] = useState('');
  const [failedJump, setFailedJump] = useState<{ date: string; ticker?: string; message: string } | null>(null);

  const allNews = useMemo(() => getAllHistoricalNews(), []);

  const filteredNews = useMemo(() => {
    return filterNewsEvents(allNews, {
      category,
      sentiment,
      query: searchQuery,
      ticker: tickerFilter || undefined,
    });
  }, [allNews, category, sentiment, searchQuery, tickerFilter]);

  const handleJumpToDate = async (targetDate: string, tickerHint?: string) => {
    const activeTicker = tickerHint || selectedTicker;
    setFailedJump(null);
    try {
      const candles = await loadTickerData(activeTicker);
      const candle = getLatestCandleOnOrBefore(candles, targetDate);
      if (!candle) throw new Error(`No ${activeTicker} candle is available on or before ${targetDate}`);
      if (!setSimulationDate(targetDate)) {
        addToast('Reset the portfolio before rewinding past account activity.', 'error');
        return;
      }
      updateMarketPrices({ [activeTicker]: candle.close });
      processCandleForOrders(candle, activeTicker);
      addToast(`Jumped simulation timeline to ${targetDate}.`, 'info');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown market-data error';
      setFailedJump({ date: targetDate, ticker: tickerHint, message });
      addToast(`Could not load ${activeTicker} data for ${targetDate}.`, 'error');
    }
  };

  return (
    <div className={styles.container}>
      {failedJump && (
        <div role="alert">
          Timeline data could not be loaded: {failedJump.message}.{' '}
          <button type="button" onClick={() => void handleJumpToDate(failedJump.date, failedJump.ticker)}>Retry timeline jump</button>
        </div>
      )}
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Historical News & Catalyst Timeline</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Explore macroeconomic shocks, Fed decisions, and corporate events from 2015 to 2024.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search headlines, keywords, tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.filtersRow}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
        {(['all', 'macro', 'fed', 'earnings', 'geopolitical', 'tech'] as const).map((cat) => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${category === cat ? styles.filterBtnActive : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}

        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '12px' }}>
          Sentiment:
        </span>
        {(['all', 'bullish', 'bearish', 'neutral'] as const).map((sent) => (
          <button
            key={sent}
            className={`${styles.filterBtn} ${sentiment === sent ? styles.filterBtnActive : ''}`}
            onClick={() => setSentiment(sent)}
          >
            {sent}
          </button>
        ))}

        {tickerFilter && (
          <button
            className={styles.filterBtn}
            style={{ backgroundColor: 'var(--bg-card-hover)', marginLeft: 'auto' }}
            onClick={() => setTickerFilter('')}
          >
            Clear Ticker Filter: {tickerFilter} ✕
          </button>
        )}
      </div>

      <div className={styles.feedList}>
        {filteredNews.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No historical news events matched the selected filter criteria.
          </div>
        ) : (
          filteredNews.map((item) => {
            const isCurrentDate = item.date === simulationDate;
            const sentimentClass = item.sentiment === 'bullish'
              ? styles.sentimentBullish
              : (item.sentiment === 'bearish' ? styles.sentimentBearish : styles.sentimentNeutral);

            return (
              <div
                key={item.id}
                className={styles.feedItem}
                style={{
                  borderColor: isCurrentDate ? 'var(--accent)' : undefined,
                  boxShadow: isCurrentDate ? '0 0 0 1px var(--accent)' : undefined,
                }}
              >
                <div className={styles.itemTop}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="var(--accent)" />
                    <span className={styles.dateBadge}>{item.date}</span>
                  </div>

                  <div className={styles.badgeGroup}>
                    <span className={styles.catBadge}>{item.category}</span>
                    <span className={sentimentClass}>{item.sentiment}</span>
                  </div>
                </div>

                <div className={styles.headline}>{item.headline}</div>
                <div className={styles.summary}>{item.summary}</div>

                <div className={styles.itemFooter}>
                  <div className={styles.tickerPills}>
                    {item.affectedTickers.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={styles.tickerPill}
                        onClick={() => setTickerFilter(t)}
                        title={`Filter news by ${t}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={styles.jumpBtn}
                    onClick={() => handleJumpToDate(item.date, item.affectedTickers[0])}
                  >
                    Jump Simulation to Date <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
