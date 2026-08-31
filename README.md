# MockMarket

> Synthetic markets. Fake money. Real lessons.

MockMarket is a client-side TypeScript and React market simulator and algorithmic backtesting platform. It bundles 10 years of deterministic synthetic daily OHLCV data (2015 to 2024) across 84+ US equities, sector ETFs, and cryptocurrencies, plus trading strategy DSL compilers, custom ETF construction, risk analytics, and 20 educational market scenarios.

> **Data notice:** Bundled prices, volume, benchmark returns, and simulation results are generated or approximate, not actual market history. See [DATA.md](DATA.md) for provenance, methodology, calendars, and limitations. MockMarket is for education only and is not financial advice.

---

## Key Features

1. **High-Performance Paper Trading**
   - Market orders, limit orders, stop losses, and take profit triggers.
   - Realistic position sizing, average cost basis, and realized/unrealized P&L tracking.
   - Interactive TradingView-grade Candlestick charts powered by Lightweight-Charts v5.
   - Pure TypeScript technical indicator overlays: SMA (20/50/200), EMA (12/26), RSI (14), MACD (12, 26, 9), Bollinger Bands (20, 2), and Volume Moving Average.

2. **Simulation Timeline Engine**
   - Historical time-travel stepping (+1D, +1W, +1M, +3M, +1Y).
   - Auto-play simulation playback (1x, 2x, 5x, 10x speeds).
   - Strict forward-looking prevention: charts and pricing engines strictly mask future candles past the active simulation date.

3. **Institutional Risk Analytics**
   - Annualized Return & Annualized Volatility.
   - Beta calculation measured against benchmark SPY.
   - Maximum Drawdown (peak-to-trough equity curve analysis).
   - Value at Risk (Parametric 95% 1-Day VaR).
   - Sharpe Ratio (risk-free rate adjusted) and Sortino Ratio (downside deviation adjusted).
   - Portfolio Diversification Score derived from sector Herfindahl-Hirschman Index (HHI).

4. **Trading Strategy DSL & Visual Backtester**
   - Custom Domain-Specific Language (Lexer, Recursive Descent AST Parser, and Execution Compiler).
   - Supports indicator functions, comparison operators, cross functions (`crosses_above`, `crosses_below`), and boolean logic (`AND`, `OR`).
   - Strategy templates included: Golden Cross, RSI Mean Reversion, Bollinger Band Bounce, and MACD Crossover.
   - Detailed backtest analytics: CAGR, Win Rate, Profit Factor, Max Drawdown, Monthly Returns Heatmap Calendar Grid, and Trade Execution Log.

5. **Custom ETF Builder & Portfolio Drift Engine**
   - Custom fund construction with weight sliders, normalization helpers, and equal-weight distribution.
   - Periodic rebalancing simulations: Monthly, Quarterly, Annually, or Never (Drift).
   - Daily Net Asset Value (NAV) computation and Tracking Error analysis.
   - Stacked Area chart visualizing weight drift over synthetic market cycles.

6. **Historical Catalyst Timeline & What-If Time Machine**
   - Curated news and macroeconomic catalyst database spanning 10 years of Fed decisions, earnings releases, and black swan events.
   - Time Machine Investment Calculator comparing lumpsum vs recurring dollar-cost averaging (DCA) with milestone markers.

7. **20 Educational Historical Scenarios**
   - Interactive decision trees covering historic market shocks (COVID-19, SVB Collapse, Volmageddon, Negative Crude Oil, Christmas Eve 2018), macro shifts (2022 Fed rate hiking, 2024 Fed pivot, Trade War), earnings beats (Nvidia AI guidance, Apple $1T-$3T), and short squeezes (GameStop, Tesla S&P inclusion, Spot Bitcoin ETF).
   - Multi-step choices with historical feedback and core financial lessons.

8. **Session Sharing & Data Exports**
   - Compressed URL state serialization for instant sharing of portfolios, backtests, and ETF configurations.
   - Tabular CSV exports for trade histories, holdings snapshots, backtest execution logs, and ETF NAV histories.
   - Complete JSON portfolio snapshot export and import.

9. **Accessibility & Keyboard Shortcuts**
   - WCAG AA compliant dark and light themes.
   - Fast keyboard navigation (`1-5` for mode switching, `Space` for playback, `ArrowRight` for +1D step, `B`/`S` for buy/sell focus, `?` for cheat sheet).

---

## Technical Architecture

- **Framework**: React 19 + TypeScript + Vite 8
- **State Management**: Zustand stores with atomic slices (`useUIStore`, `usePortfolioStore`, `useBacktesterStore`, `useETFStore`)
- **Charting**: Lightweight-Charts v5, Recharts, SVG/Canvas rendering
- **Testing**: Vitest + Happy-DOM (20 test suites, 78+ unit tests)
- **Styling**: CSS Modules with design tokens and CSS custom properties

---

## Mathematical Formulas

### Sharpe Ratio

```math
\text{Sharpe} = \frac{R_p - R_f}{\sigma_p}
```

Where:
- $R_p$ is the annualized portfolio return
- $R_f$ is the risk-free benchmark rate ($2.0\%$)
- $\sigma_p$ is the annualized portfolio volatility ($\sigma_{\text{daily}} \times \sqrt{252}$)

### Sortino Ratio

```math
\text{Sortino} = \frac{R_p - R_f}{\sigma_d}
```

Where:
- $\sigma_d$ is the annualized downside deviation calculated exclusively from negative return periods

### Parametric Value at Risk (95% 1-Day VaR)

```math
\text{VaR}_{0.95} = 1.645 \times \sigma_{\text{daily}} \times \text{Portfolio Value}
```

Where $\sigma_{\text{daily}}$ is the standard deviation of daily percentage portfolio returns.

### Maximum Drawdown

```math
\text{MDD} = \max_{t \in [0, T]} \left( \frac{\text{Peak}_t - \text{Trough}_t}{\text{Peak}_t} \right)
```

### Beta vs SPY

```math
\beta = \frac{\text{Cov}(R_p, R_{\text{SPY}})}{\text{Var}(R_{\text{SPY}})}
```

### Herfindahl-Hirschman Index (HHI)

```math
\text{HHI} = \sum_{i=1}^{N} w_i^2
```

Where $w_i$ represents the fractional weight of sector $i$. The portfolio diversification score is computed as $(1 - \text{HHI}) \times 100$.

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
```bash
# Clone repository
git clone https://github.com/amanalip/MockMarket.git
cd MockMarket

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Run Test Suite
```bash
npm run test
```

### Production Build
```bash
npm run build
npm run preview
```

### Regenerate Synthetic Datasets
```bash
node scripts/generate_data.js
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `1` - `5` | Switch Navigation (Trade, Backtest, ETF, Scenarios, Timeline) |
| `Space` | Toggle Simulation Auto-Play / Pause |
| `→` | Advance Simulation Timeline +1 Day |
| `B` | Switch Trade Panel to BUY Mode |
| `S` | Switch Trade Panel to SELL Mode |
| `T` | Toggle Dark / Light Theme |
| `?` or `Shift + /` | Open / Close Keyboard Shortcuts Cheat Sheet |
| `Esc` | Close Active Modal Dialog |

---

## License

MIT License. Open source and built for financial education.
