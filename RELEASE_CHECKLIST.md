# MockMarket Release Checklist

## Release Candidate

- Version: `1.0.0`
- Date: 2026-09-01
- Release decision: approved

## Clean-Checkout Rehearsal

GitHub Actions run [33567274451](https://github.com/amanalip/MockMarket/actions/runs/33567274451) checked out revision `9782d61bb330502294a66ca612d8367726259064` into a clean runner and used Node.js 22 with npm 10.9.4.

- [x] `npm ci` completed from the lockfile.
- [x] Lint and application, unit-test, and Playwright type checks passed.
- [x] All 953 unit tests passed across 84 files with configured coverage thresholds.
- [x] All 84 catalog datasets passed deterministic integrity validation.
- [x] Dependency audit reported 0 vulnerabilities.
- [x] Production build and artifact verification passed.
- [x] All 12 configured Playwright tests passed, including Chromium, Firefox, WebKit, and mobile Chromium.
- [x] The tested production artifact deployed successfully to GitHub Pages.

A second local clean clone used Node.js 22.20.0 and npm 10.9.4. It passed every non-WebKit gate and 11 of 12 browser tests; WebKit could not launch on the Arch host because Playwright's Ubuntu browser build required `libicu74` and `libflite1`. The clean Ubuntu Actions run above is the authoritative complete rehearsal.

## Cross-Device Acceptance

The final browser-assisted pass covered the primary navigation and production bundle at representative web-browser widths.

| Target | Browser/viewport | Result |
|---|---|---|
| Desktop | Chromium, default desktop viewport | Pass |
| Tablet-width web | Chromium, 834 x 1112 | Pass |
| Mobile web | Chromium Pixel 7 emulation | Pass |
| Narrow mobile | Chromium, 320 x 720 | Pass |

- [x] Keyboard `1` through `5` navigation reached every primary mode.
- [x] `B` and `S` switched and focused the trading side controls.
- [x] Shortcut and share dialogs trap focus, close with Escape, and restore focus.
- [x] Focused horizontal tables retain native ArrowRight scrolling.
- [x] Trade, backtest, ETF persistence, scenarios, timeline, sharing, and recovery paths are covered by production E2E or focused integration tests.
- [x] Desktop, tablet-width, Pixel 7, and 320px layouts retained navigation and had no document-level horizontal overflow.
- [x] Axe reported no serious or critical violations in the five primary modes.
- [x] No release-blocking correctness, accessibility, responsive-layout, or recovery issue remains open.
