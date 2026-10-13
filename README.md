# LandRight Dashboard

LandRight is a static dashboard for land rights and land registration information. It uses published Google Sheets CSV feeds, Chart.js and GitHub Pages.

## Development

Run `npm test` with Node.js 22 or newer. The tests check that legacy sections, core data connections, and the PWA manifest remain intact.

## Release safety

Make changes on a feature branch and open a pull request. Confirm tests, data correctness, privacy, and mobile/desktop behavior before merging to `main`. GitHub Pages deployment is managed by the repository's existing Pages configuration.

Do not publish confidential or personal records through public Google Sheets CSV feeds. Do not add billing-enabled services.

## SMT2 private Sheets workflow (PR #43)

SMT2 reads Google Sheets directly using Google Identity Services and the
`spreadsheets.readonly` OAuth scope. No Apps Script service is used by this flow.
The OAuth client ID and spreadsheet ID in `smt2-config.example.js` are public
configuration, not credentials. The example filename is currently loaded by the
application. Never put a client secret or access token there.

Run `npm ci`, `npm run build:assets`, and `npm test`. Browser acceptance tests:
`npx playwright install --with-deps chromium` followed by `npm run test:browser`.
If a compatible Chromium is installed already, set `SMT2_CHROMIUM_PATH` to its
absolute executable path. Serve the checkout with
`python3 -m http.server 8000 --bind 127.0.0.1`. CSS and Chart.js are generated,
committed local assets with pinned versions and license files; regenerate them
when changing utility classes. Application runtime still has no package server.

See [latest SMT2 acceptance report](docs/smt2-security-followup.md)
and [real-account test guide](docs/smt2-google-account-testing.md) for security limits,
OAuth origins, real-account checks, and the deployment decision. Older documents
and `.reference.gs` files describe the previous architecture and are retained
as historical references; do not deploy them for this OAuth integration.

The CSS build now uses Tailwind 4.3.3 through `@tailwindcss/postcss`, with
PostCSS 8.5.30. `styles/legacy-theme.json` and `styles/legacy-preflight.css`
retain the previous static palette/reset; they contain no Tailwind 3 compiler.
The frozen Tailwind 3 stylesheet in browser test fixtures is a visual reference
only and is not shipped by the application. Browser tests compare both styles
in the same Chromium using synthetic data. `npm audit` checks the complete
dependency tree in CI, including development packages.
