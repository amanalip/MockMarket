# MockMarket Production Readiness Backlog

This file is the ordered implementation backlog for taking MockMarket from a polished prototype to a production-ready application. Implement tasks in numerical order unless a task explicitly depends on later product direction.

## Usage

- Keep task numbers stable. Do not renumber or delete completed tasks.
- Mark a completed task by changing `[ ]` to `[x]`.
- Complete the acceptance criteria and relevant automated tests before marking a task complete.
- A request such as "implement next N" means the first N unchecked tasks in this file, where N can be any batch size appropriate for the available time and context window.
- Run `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run test:e2e`, and `npm run build` after each batch where applicable.

## Correctness Blockers

### Task 1: Prevent stale ticker candles from being traded
- [x] Associate loaded candle data with its ticker and disable `TradePanel` unless that ticker matches `selectedTicker`.
- Files: `src/App.tsx`
- Acceptance: Changing tickers immediately prevents trading against the previous ticker's candle, including when the new request fails.

### Task 2: Add a regression test for stale ticker data
- [x] Add a test that loads ticker A, makes ticker B fail, and confirms ticker A's candle cannot be displayed or traded as ticker B.
- Files: `src/__tests__/`
- Acceptance: The test fails against the old behavior and passes with Task 1 implemented.

### Task 3: Revalue each holding with its own market price
- [x] Replace the selected-candle fallback that assigns one ticker's close to every portfolio position.
- Files: `src/components/timeline/SimulationBar.tsx`
- Acceptance: Advancing time never changes ticker B's price using ticker A's candle.

### Task 4: Load held-ticker prices for simulation dates
- [x] Add a date-aligned price-loading path that retrieves the latest valid candle for every held ticker when simulation time changes.
- Files: `src/components/timeline/SimulationBar.tsx`, `src/data/loader.ts`
- Acceptance: Multi-asset portfolios are revalued from each asset's own candle, with an explicit unavailable-price outcome.

### Task 5: Test multi-asset portfolio revaluation
- [x] Add tests covering two holdings with different prices and different trading calendars.
- Files: `src/__tests__/`
- Acceptance: Tests verify correct per-ticker values and behavior when one ticker has no candle on the selected date.

### Task 6: Prevent orders from filling before creation
- [x] Reject any pending-order evaluation where `candle.time` is earlier than `order.createdAt`.
- Files: `src/engine/trading/trading-engine.ts`
- Acceptance: Rewinding the timeline cannot fill an order on a candle preceding its creation date.

### Task 7: Define and implement portfolio rewind behavior
- [x] Choose and implement deterministic rewind semantics, such as restoring a dated account snapshot or disallowing rewind after trading activity.
- Files: `src/components/timeline/SimulationBar.tsx`, `src/store/index.ts`
- Acceptance: Rewinding cannot leave future trades, orders, cash, and positions mixed with an earlier market date.

### Task 8: Test timeline rewind invariants
- [x] Add integration tests for rewinding with filled trades, pending orders, and portfolio history.
- Files: `src/__tests__/`
- Acceptance: Tests prove that no future-dated account activity survives under an earlier simulation state unless explicitly supported.

### Task 9: Track realized P&L in the portfolio model
- [x] Add a realized P&L ledger or state field updated from actual sell cost basis rather than deriving it from total cash flows.
- Files: `src/model/types.ts`, `src/engine/trading/trading-engine.ts`, `src/store/index.ts`
- Acceptance: Partial and full sales preserve the correct realized gain or loss after a position closes.

### Task 10: Display realized P&L from the authoritative value
- [x] Replace the formula in `PortfolioDashboard` with the realized P&L value maintained by the portfolio model.
- Files: `src/components/portfolio/PortfolioDashboard.tsx`
- Acceptance: A buy alone shows zero realized P&L, and sales show only gains or losses actually realized.

### Task 11: Add realized P&L lifecycle tests
- [ ] Test buys, averaging in, partial sales, full closure, fees, and reopening a ticker.
- Files: `src/__tests__/`
- Acceptance: Expected realized and unrealized P&L values are asserted after every operation.

### Task 12: Keep portfolio history chronologically sorted
- [ ] Store snapshots by date order rather than append order and replace snapshots deterministically for duplicate dates.
- Files: `src/store/index.ts`, `src/components/timeline/SimulationBar.tsx`
- Acceptance: Advancing, manually changing dates, and rewinding cannot produce unsorted or duplicate history points.

### Task 13: Record snapshots for every valuation-changing action
- [ ] Record or update the current-date snapshot after fills, cancellations that affect reservations, manual date changes, and market repricing.
- Files: `src/store/index.ts`, `src/components/timeline/SimulationBar.tsx`
- Acceptance: Portfolio analytics update after all relevant account changes, not only playback step buttons.

### Task 14: Calculate snapshot daily P&L
- [ ] Replace hard-coded `dailyPnL: 0` with the change from the previous chronological snapshot, adjusted according to the chosen cash-flow policy.
- Files: `src/components/timeline/SimulationBar.tsx`, `src/store/index.ts`
- Acceptance: Daily P&L is correct for ordinary days and documented for deposit or reset events.

### Task 15: Use actual SPY returns for portfolio beta
- [ ] Replace the benchmark derived from portfolio returns with date-aligned returns loaded from SPY candles.
- Files: `src/components/portfolio/RiskDashboard.tsx`, `src/data/loader.ts`
- Acceptance: Beta uses independent SPY observations and displays unavailable when there are too few aligned samples.

### Task 16: Test risk analytics against known series
- [ ] Add deterministic tests for portfolio returns, SPY alignment, beta, volatility, VaR, and drawdown.
- Files: `src/__tests__/`
- Acceptance: Tests use hand-verifiable time series and cover missing dates and insufficient history.

### Task 17: Eliminate same-bar look-ahead in backtests
- [ ] Evaluate a signal on one completed candle and execute it no earlier than the next eligible candle.
- Files: `src/engine/backtester/backtester.ts`
- Acceptance: A rule using the current close cannot receive that same close as its execution price.

### Task 18: Make backtest stop-loss fills gap-aware
- [ ] Fill a stop at the candle open when price gaps through the stop instead of always filling at the stop price.
- Files: `src/engine/backtester/backtester.ts`
- Acceptance: A long position whose next open is below its stop exits at the worse opening price.

### Task 19: Make backtest take-profit fills gap-aware
- [ ] Fill a target at the candle open when price gaps favorably through the target.
- Files: `src/engine/backtester/backtester.ts`
- Acceptance: Target execution follows a documented and tested opening-gap policy.

### Task 20: Forward-fill aligned benchmark prices
- [ ] Use the latest prior valid benchmark close when an asset date has no benchmark candle.
- Files: `src/engine/backtester/backtester.ts`, `src/engine/timemachine/timemachine.ts`
- Acceptance: Crypto weekends and calendar mismatches do not reset the benchmark to its initial value.

### Task 21: Add backtest execution realism tests
- [ ] Add tests for next-bar execution, stop gaps, target gaps, and benchmark calendar mismatches.
- Files: `src/__tests__/`
- Acceptance: Each corrected execution rule has a focused regression test.

### Task 22: Reserve cash for pending buy orders
- [ ] Track cash reserved by pending buys and calculate available cash after all open-order commitments.
- Files: `src/engine/trading/trading-engine.ts`, `src/model/types.ts`, `src/store/index.ts`
- Acceptance: Multiple pending buys cannot collectively commit more than available cash.

### Task 23: Release reserved cash through the full order lifecycle
- [ ] Release the correct reservation when an order fills, is cancelled, expires, or is rejected at execution.
- Files: `src/engine/trading/trading-engine.ts`
- Acceptance: Available and reserved balances remain consistent after every terminal order status.

### Task 24: Canonicalize ticker symbols at order entry
- [ ] Normalize ticker casing once before validation, lookup, order storage, and position updates.
- Files: `src/engine/trading/trading-engine.ts`
- Acceptance: Lowercase and mixed-case requests cannot create duplicate positions or fail after passing validation.

### Task 25: Test order reservation and ticker normalization
- [ ] Add tests for overcommitted pending buys, cancellation release, fill release, and mixed-case buy and sell requests.
- Files: `src/__tests__/`
- Acceptance: Cash, reservations, orders, and positions remain internally consistent.

### Task 26: Use a cash-flow-aware return for recurring investments
- [ ] Replace or supplement time-machine CAGR with XIRR or another documented money-weighted return when recurring contributions are enabled.
- Files: `src/engine/timemachine/timemachine.ts`
- Acceptance: Contribution timing affects the reported annualized return correctly, and lump-sum behavior remains valid.

## Data Integrity And Product Claims

### Task 27: Correct the real-data product claim
- [ ] Replace claims of real historical prices with clear synthetic-data language unless verified historical datasets are introduced.
- Files: `README.md`, `package.json`, visible application copy
- Acceptance: No user-facing or repository text implies generated OHLCV values are actual market history.

### Task 28: Add a visible synthetic-data disclaimer
- [ ] Display an unobtrusive but clear disclaimer in the application near trading and backtesting features.
- Files: `src/components/ui/`, `src/App.tsx`
- Acceptance: Users can see that results are educational simulations based on synthetic or approximate data.

### Task 29: Document dataset provenance and limitations
- [ ] Add documentation for generation methodology, date range, adjustment policy, timezone, splits, dividends, calendars, and intended use.
- Files: `README.md` or a dedicated data documentation file
- Acceptance: A reviewer can determine exactly what the bundled data represents and does not represent.

### Task 30: Use a real exchange calendar for generated equities
- [ ] Replace weekday-only date generation with a maintained US exchange calendar covering all included years.
- Files: `scripts/generate_data.js`
- Acceptance: Equity and ETF datasets exclude weekends and all relevant full-day market holidays.

### Task 31: Validate complete candle schemas at load time
- [ ] Validate date format, finite positive OHLC values, nonnegative volume, and valid OHLC relationships for every candle.
- Files: `src/data/loader.ts`
- Acceptance: Malformed candles are rejected with a useful error rather than silently entering calculations.

### Task 32: Enforce candle ordering and uniqueness
- [ ] Reject or deterministically normalize unsorted and duplicate candle dates at the data boundary.
- Files: `src/data/loader.ts`
- Acceptance: All downstream consumers receive strictly ascending, unique candle dates.

### Task 33: Validate every committed dataset in CI
- [ ] Add a script that checks every ticker file for schema, OHLC invariants, ordering, duplicates, expected calendar, and ticker coverage.
- Files: `scripts/`, `package.json`, `.github/workflows/ci.yml`
- Acceptance: Any invalid committed market-data file fails CI with its path and reason.

### Task 34: Add deterministic dataset integrity checks
- [ ] Record and verify generation metadata or checksums so accidental dataset changes are visible and reproducible.
- Files: `scripts/`, `public/data/`, `.github/workflows/ci.yml`
- Acceptance: CI can distinguish intentional regenerated data from unexplained changes.

### Task 35: Remove `eval` from ticker export tooling
- [ ] Parse the ticker source as structured data instead of evaluating source text.
- Files: `scripts/export_tickers_json.js`
- Acceptance: Running the script cannot execute arbitrary JavaScript from the input file.

### Task 36: Constrain generated ticker output paths
- [ ] Validate ticker names and verify resolved paths remain inside the intended `public/data` directory.
- Files: `scripts/generate_data.js`
- Acceptance: Malicious or malformed ticker values cannot write outside the data directory.

## Sharing, Persistence, And Error Recovery

### Task 37: Restore shared URL state on application startup
- [ ] Read `#share=` at startup, decode it, and atomically apply supported state to the appropriate stores.
- Files: `src/App.tsx`, `src/engine/export/url-state.ts`, `src/store/index.ts`
- Acceptance: Opening a generated share link in a fresh browser restores the represented session.

### Task 38: Strictly validate shared-state payloads
- [ ] Validate version, mode, ticker allowlist, dates, numeric ranges, collection sizes, and nested object schemas before applying shared state.
- Files: `src/engine/export/url-state.ts`
- Acceptance: Invalid, oversized, unsupported, and partially malicious payloads are rejected without changing application state.

### Task 39: Add an end-to-end share-link round-trip test
- [ ] Generate a link in one browser context, open it in a fresh context, and assert restored state.
- Files: `e2e/`
- Acceptance: The real user-facing share workflow passes in Playwright.

### Task 40: Report clipboard copy failures accurately
- [ ] Await `navigator.clipboard.writeText`, handle rejection, and provide a manual-copy fallback.
- Files: `src/components/ui/ShareModal.tsx`
- Acceptance: Success is shown only after a successful copy, and unsupported or denied clipboard access gives actionable feedback.

### Task 41: Implement portfolio JSON import or remove the claim
- [ ] Add validated portfolio import matching the documented export format, or explicitly remove import from product documentation.
- Files: `src/components/ui/ShareModal.tsx`, `src/engine/export/`, `README.md`
- Acceptance: Documentation and shipped functionality agree, and imported state is schema-validated.

### Task 42: Persist saved ETFs or rename the feature
- [ ] Store saved ETFs across reloads using a versioned local persistence format, or change the UI so it does not imply persistence.
- Files: `src/store/index.ts`, `src/components/etf/`
- Acceptance: The feature behavior matches its label and handles corrupt or outdated persisted data safely.

### Task 43: Add user-visible market-data load errors
- [ ] Replace console-only failures with contextual errors, retry controls, and disabled dependent actions.
- Files: `src/App.tsx`, relevant data-consuming components
- Acceptance: Failed ticker and ETF loads cannot leave stale results appearing current.

### Task 44: Add application-level crash containment
- [ ] Wrap the application in an error boundary with a recovery action and accessible fallback UI.
- Files: `src/main.tsx`, `src/components/ui/`
- Acceptance: A render exception does not leave users with a blank page.

### Task 45: Add production client error reporting
- [ ] Integrate a privacy-conscious error-reporting mechanism with release identifiers and environment filtering.
- Files: application bootstrap and deployment configuration
- Acceptance: Unexpected production errors are observable without collecting financial simulation contents or unnecessary personal data.

## CI, Deployment, And Security

### Task 46: Gate deployment on all required quality checks
- [ ] Make Pages deployment depend on successful lint, type checking, unit tests, dataset validation, E2E tests, and production build.
- Files: `.github/workflows/ci.yml`, `.github/workflows/static.yml`
- Acceptance: A failing required check makes production deployment impossible.

### Task 47: Fix the failing Playwright smoke locator
- [ ] Replace the ambiguous text locator with semantic role-based assertions.
- Files: `e2e/smoke.spec.ts`
- Acceptance: The smoke test passes without disabling Playwright strict mode.

### Task 48: Run Playwright against the production bundle
- [ ] Configure E2E tests to build and serve `vite preview` rather than the development server.
- Files: `playwright.config.ts`, `package.json`
- Acceptance: E2E tests verify production assets, base paths, and runtime behavior.

### Task 49: Add critical trading E2E coverage
- [ ] Add one browser flow covering ticker selection, buy, time advance, repricing, sell, and displayed P&L.
- Files: `e2e/`
- Acceptance: The primary paper-trading journey passes against the production bundle.

### Task 50: Add critical backtest E2E coverage
- [ ] Add one browser flow that configures, runs, and validates a deterministic backtest result.
- Files: `e2e/`
- Acceptance: Backtest configuration and result rendering work end-to-end.

### Task 51: Add critical ETF E2E coverage
- [ ] Add one browser flow that constructs, simulates, saves, reloads, and validates an ETF.
- Files: `e2e/`
- Acceptance: The primary ETF workflow passes against the production bundle.

### Task 52: Expand browser and viewport coverage
- [ ] Run smoke tests on Chromium, Firefox, WebKit, and at least one mobile viewport.
- Files: `playwright.config.ts`, `.github/workflows/ci.yml`
- Acceptance: CI reports browser-specific failures and mobile layout regressions.

### Task 53: Pin GitHub Actions to commit SHAs
- [ ] Replace mutable major-version action tags with reviewed full commit SHAs and retain version comments.
- Files: `.github/workflows/*.yml`
- Acceptance: Workflow dependencies cannot change without a repository diff.

### Task 54: Apply least-privilege workflow permissions
- [ ] Set read-only defaults and grant Pages and OIDC write permissions only to the deployment job that needs them.
- Files: `.github/workflows/*.yml`
- Acceptance: CI jobs cannot write repository, Pages, or identity resources unnecessarily.

### Task 55: Add CI timeouts and cancellation behavior
- [ ] Add job timeouts and cancel superseded CI runs while preserving safe deployment concurrency.
- Files: `.github/workflows/*.yml`
- Acceptance: Hung and obsolete jobs do not consume runners indefinitely.

### Task 56: Add automated dependency update configuration
- [ ] Configure Dependabot or Renovate for npm and GitHub Actions with a controlled schedule.
- Files: `.github/dependabot.yml` or equivalent
- Acceptance: Dependency and action updates are proposed automatically with lockfile changes.

### Task 57: Add a vulnerability reporting policy
- [ ] Create `SECURITY.md` with supported versions, private reporting instructions, and response expectations.
- Files: `SECURITY.md`
- Acceptance: Security researchers have a documented non-public reporting path.

### Task 58: Add browser security policy metadata
- [ ] Define the strongest practical CSP, referrer policy, and permissions policy supported by the static hosting approach.
- Files: `index.html`, deployment documentation or hosting configuration
- Acceptance: Production behavior is tested under the policy and unnecessary browser capabilities are disabled.

### Task 59: Remove runtime Google Fonts dependence
- [ ] Self-host required font files or use a system-font stack.
- Files: `index.html`, CSS, `public/`
- Acceptance: The application renders as intended without contacting Google or depending on third-party font availability.

## Accessibility And Responsive Design

### Task 60: Restore visible keyboard focus for buttons
- [ ] Remove the global focus-outline suppression or add a high-contrast `:focus-visible` replacement.
- Files: `src/index.css`
- Acceptance: Every button has a clearly visible keyboard focus indicator in both themes.

### Task 61: Implement complete modal semantics
- [ ] Give each modal a labelled dialog role, `aria-modal`, accessible close name, initial focus, focus trap, Escape handling, and focus restoration.
- Files: `src/components/ui/ShareModal.tsx`, `src/components/ui/ShortcutsModal.tsx`
- Acceptance: Both modals are fully operable and correctly announced using keyboard and screen-reader navigation.

### Task 62: Make stock table sorting keyboard accessible
- [ ] Replace clickable table-header behavior with semantic controls and expose sort direction through `aria-sort`.
- Files: `src/components/stockpicker/StockScreener.tsx`
- Acceptance: Every sortable column can be operated without a pointer.

### Task 63: Make stock row selection keyboard accessible
- [ ] Replace mouse-only row selection with a semantic link or button for each ticker.
- Files: `src/components/stockpicker/StockScreener.tsx`
- Acceptance: Keyboard and assistive-technology users can select every listed ticker.

### Task 64: Make portfolio ticker selection semantic
- [ ] Replace clickable non-interactive ticker text with a button or link.
- Files: `src/components/portfolio/PortfolioDashboard.tsx`
- Acceptance: Ticker navigation is focusable, named, and keyboard operable.

### Task 65: Implement a responsive application shell
- [ ] Add a mobile navigation pattern and prevent the fixed sidebar from consuming inaccessible viewport width.
- Files: `src/components/ui/Sidebar.module.css`, layout components
- Acceptance: Primary navigation remains reachable at 320 CSS pixels and 200% zoom.

### Task 66: Make trading and analytics grids responsive
- [ ] Replace fixed-width content grids with tested single-column or scroll-safe layouts at narrow widths.
- Files: `src/App.tsx`, component CSS modules
- Acceptance: Trading controls, tables, and charts remain reachable without clipped horizontal content.

### Task 67: Run and fix an automated accessibility audit
- [ ] Add an Axe-based accessibility test for each primary application mode and resolve serious or critical violations.
- Files: test dependencies, `src/__tests__/` or `e2e/`
- Acceptance: Automated audits pass in trade, backtest, ETF, scenario, and timeline modes.

## Performance, Tooling, And Maintainability

### Task 68: Split the production JavaScript bundle
- [ ] Lazy-load major application modes and heavy charting dependencies.
- Files: `src/App.tsx`, component imports, Vite configuration
- Acceptance: The initial production chunk is below the configured 500 kB warning threshold without hiding the warning.

### Task 69: Remove confirmed unused dependencies
- [ ] Verify and remove packages with no runtime or tooling use, including unused CodeMirror, table, image, and compression packages.
- Files: `package.json`, `package-lock.json`
- Acceptance: `npm ls`, tests, and build pass with a smaller dependency surface.

### Task 70: Declare supported Node and package-manager versions
- [ ] Add `engines` and `packageManager` metadata matching local and CI requirements.
- Files: `package.json`, `README.md`
- Acceptance: Unsupported environments receive clear guidance and CI uses the documented version.

### Task 71: Make the build script cross-platform
- [ ] Replace Unix-only `cp` and `touch` commands with a portable Node script or Vite plugin.
- Files: `package.json`, `scripts/`
- Acceptance: The production build succeeds on supported Windows, macOS, and Linux environments.

### Task 72: Type-check test code
- [ ] Add TypeScript configurations or commands that include unit and Playwright tests.
- Files: `tsconfig*.json`, `package.json`, `.github/workflows/ci.yml`
- Acceptance: Type errors in test files fail local checks and CI.

### Task 73: Enforce meaningful test coverage thresholds
- [ ] Enable coverage reporting and set initial branch, function, line, and statement thresholds based on measured coverage.
- Files: `vite.config.ts`, `package.json`, `.github/workflows/ci.yml`
- Acceptance: Coverage regressions below agreed thresholds fail CI.

### Task 74: Remove React `act` warnings from tests
- [ ] Update asynchronous component and hook tests to await settled user-visible behavior through supported testing-library APIs.
- Files: affected files under `src/__tests__/`
- Acceptance: Unit tests complete without React `act(...)` warnings.

### Task 75: Remove zero-size chart warnings from tests
- [ ] Provide deterministic chart container dimensions or appropriate chart mocks in the test environment.
- Files: test setup and affected component tests
- Acceptance: Unit tests complete without Recharts width or height warnings.

### Task 76: Make fuzz tests deterministic
- [ ] Replace unseeded `Math.random()` use with a logged, reproducible seed.
- Files: `src/__tests__/hooks-perf-fuzz.test.ts`, other fuzz tests
- Acceptance: Any fuzz failure can be reproduced using its reported seed.

### Task 77: Separate performance assertions from correctness CI
- [ ] Move wall-clock performance thresholds to a controlled benchmark job or replace them with stable complexity-oriented checks.
- Files: performance-related tests and CI workflow
- Acceptance: Shared-runner timing variance cannot randomly fail the correctness suite.

### Task 78: Make the deployment base path configurable
- [ ] Derive the Vite base and artifact verification path from deployment configuration rather than hard-coding `/MockMarket/`.
- Files: `vite.config.ts`, `.github/workflows/static.yml`
- Acceptance: Forks, repository renames, custom domains, and root deployments can build without source edits.

### Task 79: Add release information to the application
- [ ] Embed and expose a build version or commit identifier for support and error correlation.
- Files: Vite configuration, application UI or diagnostics
- Acceptance: A production report can identify the exact deployed revision.

### Task 80: Reconcile documentation with shipped behavior
- [ ] Correct framework versions, test runner details, test counts, feature descriptions, and setup commands.
- Files: `README.md`
- Acceptance: Every objective technical and feature claim in the README matches the current repository.

## Final Release Validation

### Task 81: Add a production-readiness validation command
- [ ] Create one command that runs lint, all type checks, unit coverage, data validation, E2E tests, dependency audit, and production build.
- Files: `package.json`, supporting scripts
- Acceptance: Contributors and CI can execute the complete release gate consistently with one command.

### Task 82: Document the static application threat model
- [ ] Document trust boundaries, local storage, URL state, third-party resources, deployment controls, and the absence of backend authentication or protected data.
- Files: dedicated security or architecture documentation
- Acceptance: Security assumptions and out-of-scope server controls are explicit and reviewable.

### Task 83: Perform a clean-checkout release rehearsal
- [ ] Run the complete release gate from a fresh clone using only documented prerequisites.
- Files: no implementation file required; record results in release documentation
- Acceptance: Installation, validation, build, and production preview succeed without undeclared local state.

### Task 84: Perform a final manual cross-device acceptance pass
- [ ] Verify all primary workflows with keyboard-only navigation and representative desktop, tablet, and mobile devices.
- Files: record results in release documentation
- Acceptance: No release-blocking correctness, accessibility, responsive-layout, or recovery issue remains open.
