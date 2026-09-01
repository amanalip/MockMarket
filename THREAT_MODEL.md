# Static Application Threat Model

## Scope And Assets

MockMarket is a static educational simulator delivered as HTML, JavaScript, CSS, and bundled synthetic datasets. It has no application server, database, user accounts, authentication, authorization, payment processing, secrets, or protected financial data. Portfolio values and trades are simulations in one browser and are not brokerage instructions.

The assets in scope are application integrity, availability, the accuracy of synthetic simulation state, and the privacy of browser-local diagnostics and saved ETF configurations. Server-side account controls, cross-user isolation, transaction authorization, and regulated-data controls are out of scope because those systems do not exist.

## Trust Boundaries

- The deployed HTML, scripts, styles, and datasets are same-origin build artifacts. Their integrity depends on repository access, reviewed changes, locked dependencies, GitHub Actions, and GitHub Pages.
- URL fragments and imported or decoded share state are untrusted. Decoding applies size, schema, ticker, date, numeric-range, and key allow-list validation before state restoration.
- `localStorage` is untrusted browser input. Theme values and versioned saved ETF records are validated before use. Client error records contain only a generated reference, timestamp, release, environment, source, and error type.
- Clipboard writes require a user action and may be denied by the browser. The application presents the share URL for manual copying after a denial.
- Bundled market data is generated repository content, not a trusted market feed. Runtime data requests remain on the configured application origin.
- Links to GitHub are user-triggered navigations. No runtime third-party scripts, fonts, analytics, advertisements, or API calls are required.

## Primary Threats And Controls

| Threat | Control |
|---|---|
| Script or markup injection through shared state | Strict decoded-state schema and length limits; React text rendering; no dynamic code execution |
| Corrupt persisted ETF or theme state | Versioned ETF storage, schema validation, bounded values, safe defaults, and storage exception handling |
| Malicious or malformed strategy rules | Bounded rule lengths and a purpose-built lexer/parser rather than `eval` or `Function` |
| Dependency or build compromise | Lockfile installation with `npm ci`, dependency audit, pinned GitHub Actions, type checks, tests, data validation, and production artifact verification |
| Deployment under an incorrect path | One normalized `VITE_BASE_PATH` drives the build, preview tests, and artifact verification |
| Client failure without support correlation | Embedded release identifier and bounded, sanitized local diagnostics with no simulation or personal payload |
| Unintended browser capabilities or exfiltration | Restrictive document CSP and referrer policy, same-origin runtime resources, no backend credentials, and no third-party runtime integrations |

## Storage And Data Lifetime

The browser may retain `mockmarket_theme`, `mockmarket_saved_etfs`, and up to 20 sanitized `mockmarket_client_errors_v1` records. Clearing site data removes them. Trading portfolios and pending orders are in-memory state and disappear on reload. Share URLs can contain supported simulation settings in the fragment; fragments are not sent in HTTP requests, but users should still treat shared URLs as public.

## Deployment Limitations

GitHub Pages does not allow this repository to set arbitrary response headers. The document CSP and `no-referrer` policy reduce exposure, but controls requiring response headers, including CSP `frame-ancestors` and `Permissions-Policy`, cannot be enforced there. A host with configurable headers should provide those controls. Repository administrators, GitHub, Actions dependencies, npm packages, and the Pages platform remain supply-chain trust dependencies.

## Security Validation And Reporting

Run `npm run validate:release` before release. It executes lint, all type checks, unit coverage thresholds, market-data validation, dependency audit, production build and artifact checks, and production E2E tests. Vulnerabilities should be reported through the private process in [SECURITY.md](SECURITY.md).
