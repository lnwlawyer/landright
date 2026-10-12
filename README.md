# LandRight Dashboard

LandRight is a static dashboard for land rights and land registration information. It uses published Google Sheets CSV feeds, Chart.js and GitHub Pages.

## Development

Run `npm test` with Node.js 22 or newer. The tests check that legacy sections, core data connections, and the PWA manifest remain intact.

## Release safety

Make changes on a feature branch and open a pull request. Confirm tests, data correctness, privacy, and mobile/desktop behavior before merging to `main`. GitHub Pages deployment is managed by the repository's existing Pages configuration.

Do not publish confidential or personal records through public Google Sheets CSV feeds. Do not add billing-enabled services.
