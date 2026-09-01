# MockMarket

> Synthetic markets. Fake money. Real lessons.

MockMarket is a client-side TypeScript and React market simulator and algorithmic backtesting platform. It bundles 10 years of deterministic synthetic daily OHLCV data (2015 to 2024) across 84 US equities, sector ETFs, and cryptocurrencies, plus trading strategy DSL compilers, custom ETF construction, risk analytics, and 20 educational market scenarios.

> **Data notice:** Bundled prices, volume, benchmark returns, and simulation results are generated or approximate, not actual market history. See [DATA.md](DATA.md) for provenance, methodology, calendars, and limitations. MockMarket is for education only and is not financial advice.

---

## Key Features

1. **High-Performance Paper Trading**
   - Market orders, limit orders, stop losses, and take profit triggers.
   - Realistic position sizing, average cost basis, and realized/unrealized P&L tracking.
   - Interactive candlestick charts powered by Lightweight-Charts v5.
   - Pure TypeScript technical indicator overlays: SMA (20/50/200), EMA (12/26), RSI (14), MACD (12, 26, 9), Bollinger Bands (20, 2), and Volume Moving Average.

2. **Simulation Timeline Engine**
   - Historical time-travel stepping (+1D, +1W, +1M, +3M, +1Y).
   - Auto-play simulation playback (1x, 2x, 5x, 10x speeds).
   - Strict forward-looking prevention: charts and pricing engines strictly mask future candles past the active simulation date.

3. **Portfolio Risk Analytics**
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
   - URL state serialization for sharing supported session settings, backtests, and ETF configurations.
   - Tabular CSV exports for trade histories, holdings snapshots, backtest execution logs, and ETF NAV histories.
   - Complete JSON portfolio snapshot export for offline inspection.

9. **Accessibility & Keyboard Shortcuts**
   - Dark and light themes with automated Axe checks for serious and critical accessibility violations in every primary mode.
   - Fast keyboard navigation (`1-5` for mode switching, `Space` for playback, `ArrowRight` for +1D step, `B`/`S` for buy/sell focus, `?` for cheat sheet).

---

## Technical Architecture

- **Framework**: React 19 + TypeScript + Vite 6
- **State Management**: Zustand stores with atomic slices (`useUIStore`, `usePortfolioStore`, `useBacktesterStore`, `useETFStore`)
- **Charting**: Lightweight-Charts v5, Recharts, SVG/Canvas rendering
- **Testing**: 953 Vitest + jsdom unit tests across 84 files, plus six Playwright browser specifications
- **Styling**: CSS Modules with design tokens and CSS custom properties

---

## Mathematical Formulas

### Sharpe Ratio

```math
\text{Sharpe} = \frac{R_p - R_f}{\sigma_p}
```

Where:
- $R_p$ is the annualized portfolio return
- $R_f$ is the default risk-free benchmark rate ($4.0\%$)
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

Where $w_i$ is the percentage weight of sector $i$, so HHI ranges from 0 to 10,000. The diversification score is `clamp(round((10000 - HHI) / 90), 0, 100)`, where 100 corresponds to an HHI of 1,000 or lower and 0 corresponds to a single-sector portfolio.

---

## Getting Started

### Prerequisites
- Node.js 22.x
- npm 10.x (10.9.4 recommended and used by CI)

### Installation
```bash
# Clone repository
git clone https://github.com/amanalip/MockMarket.git
cd MockMarket

# Install the locked dependency tree
npm ci
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

### Quality Checks
```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run data:validate
npm run test:e2e
```

### Production Build
```bash
npm run build
npm run build:verify
npm run preview
```

Production deployments can set `VITE_BASE_PATH` to `/` or a project path such as `/repository-name/`. CI derives the GitHub Pages project path from the repository name unless the `VITE_BASE_PATH` repository variable overrides it. The deployed revision appears in the sidebar and in sanitized client error diagnostics.

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

## Browser Security Policy

The production HTML defines a Content Security Policy that limits resources to the application origin, disables plugins, restricts form submissions, and permits only the inline styles required by the current React UI. It also applies a `no-referrer` policy. The application uses system font stacks and makes no runtime font requests to third parties.

GitHub Pages does not provide repository-controlled custom response headers. Consequently, `Permissions-Policy` and protections that require headers, including CSP `frame-ancestors`, cannot be enforced by this deployment. A future host with configurable headers should set an explicit `Permissions-Policy` disabling unused capabilities (including camera, microphone, geolocation, payment, and USB) and deliver CSP as an HTTP response header.

---

## License

MIT License. Open source and built for financial education.
