import React, { useState, useMemo } from 'react';
import { CORE_TICKERS, getAllSectors, getAllIndustries } from '../../model/tickers';
import { TickerInfo, AssetType } from '../../model/types';
import { useUIStore } from '../../store';
import { Search, ArrowUpDown } from 'lucide-react';
import styles from './StockScreener.module.css';

type SortField = 'ticker' | 'name' | 'sector' | 'marketCap' | 'peRatio' | 'dividendYield';
type SortDirection = 'asc' | 'desc';

export const StockScreener: React.FC = () => {
  const { selectedTicker, setSelectedTicker } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('marketCap');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const sectors = useMemo(() => getAllSectors(), []);
  const industries = useMemo(() => getAllIndustries(sectorFilter), [sectorFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filteredTickers = useMemo(() => {
    return CORE_TICKERS.filter((item) => {
      if (typeFilter !== 'all' && item.assetType !== typeFilter) return false;
      if (sectorFilter && item.sector !== sectorFilter) return false;
      if (industryFilter && item.industry !== industryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTicker = item.ticker.toLowerCase().includes(term);
        const matchesName = item.name.toLowerCase().includes(term);
        if (!matchesTicker && !matchesName) return false;
      }
      return true;
    }).sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'string') {
        return sortDir === 'asc'
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [searchTerm, sectorFilter, industryFilter, typeFilter, sortField, sortDir]);

  const formatMarketCap = (val?: number) => {
    if (!val) return 'N/A';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const getAssetBadgeClass = (type: AssetType) => {
    if (type === 'etf') return styles.badgeEtf;
    if (type === 'crypto') return styles.badgeCrypto;
    return styles.badgeStock;
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.searchGroup}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search ticker or company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <select
            className={styles.select}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by asset type"
          >
            <option value="all">All Asset Types</option>
            <option value="stock">Stocks</option>
            <option value="etf">ETFs</option>
            <option value="crypto">Crypto</option>
          </select>

          <select
            className={styles.select}
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setIndustryFilter('');
            }}
            aria-label="Filter by sector"
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className={styles.select}
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            aria-label="Filter by industry"
          >
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('ticker')}>
                Ticker <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th onClick={() => handleSort('name')}>
                Name <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th>Type</th>
              <th onClick={() => handleSort('sector')}>
                Sector <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th>Industry</th>
              <th className={styles.numberCol} onClick={() => handleSort('marketCap')}>
                Market Cap <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th className={styles.numberCol} onClick={() => handleSort('peRatio')}>
                P/E Ratio <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
              <th className={styles.numberCol} onClick={() => handleSort('dividendYield')}>
                Div Yield <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTickers.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyMessage}>
                  No instruments match the selected search criteria.
                </td>
              </tr>
            ) : (
              filteredTickers.map((item: TickerInfo) => {
                const isSelected = selectedTicker === item.ticker;
                return (
                  <tr
                    key={item.ticker}
                    className={isSelected ? styles.selectedRow : ''}
                    onClick={() => setSelectedTicker(item.ticker)}
                  >
                    <td>
                      <span className={styles.tickerBadge}>{item.ticker}</span>
                    </td>
                    <td><strong>{item.name}</strong></td>
                    <td>
                      <span className={`${styles.badge} ${getAssetBadgeClass(item.assetType)}`}>
                        {item.assetType}
                      </span>
                    </td>
                    <td>{item.sector}</td>
                    <td>{item.industry}</td>
                    <td className={styles.numberCol}>{formatMarketCap(item.marketCap)}</td>
                    <td className={styles.numberCol}>{item.peRatio && item.peRatio > 0 ? item.peRatio.toFixed(1) : '-'}</td>
                    <td className={styles.numberCol}>
                      {item.dividendYield !== undefined && item.dividendYield > 0
                        ? `${item.dividendYield.toFixed(2)}%`
                        : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
