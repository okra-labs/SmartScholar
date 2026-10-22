SmartScholar is a web-based student toolkit developed by OkraLabs. It currently provides academic and tuition-planning tools for the Institute of Accountancy Arusha (IAA), including a GPA calculator, a module catalogue, and an estimated fee instalment planner. Account registration, email verification, and password recovery are also included.

The current release supports IAA calculations. Other universities' calculators are not available. The catalogue and grading rules are based on the IAA Prospectus 2023/2024 and should be checked against current official IAA publications before being used for academic or financial decisions. Fee plans are estimates and are not official fee statements.

## Features

- GPA calculation using IAA grading scales for NTA Levels 4–8.

- Searchable IAA module catalogue in JSON and CSV formats.

- Custom module rows for courses not found in the catalogue.

- Estimated tuition instalments after HESLB tuition support and prior payments.

- Guest calculations held in browser memory, with user-initiated CSV export.

- Account registration, email verification, and password recovery when SMTP is configured.

## Requirements

- Node.js 20 or later

- npm

## Run locally

1. Clone or download this repository.

2. Copy `.env.example` to `.env`.

3. Set `SESSION_SECRET` to a random value of at least 32 characters. For example:

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

4. Install dependencies and start the server:

```
npm install
npm start
```

5. Open the local URL configured by `PORT` and `APP_BASE_URL` (default: `http://localhost:8080`).

For local account registration and password recovery, configure the SMTP settings in `.env`. Without SMTP, email-dependent registration is unavailable.

## Academic data and GPA method

The catalogue is stored in `public/data/iaa-modules.json` and `public/data/iaa-modules.csv`. It contains 1,556 module records across 56 programme labels extracted from the IAA Prospectus 2023/2024. NTA levels are inferred from module codes where available. Some titles or classes may be incomplete or affected by the source PDF's formatting.

The calculator uses the credit-weighted formula:

`GPA = sum(grade points × credit hours) / sum(credit hours)`

The displayed cumulative GPA is truncated to one decimal place. The prospectus grading tables represented in this release are:

- NTA Levels 4–5: A = 4, B = 3, C = 2, D = 1, F = 0.

- NTA Levels 6–8: A = 5, B+ = 4, B = 3, C = 2, D = 1, F = 0.

The source table does not define a grade-point mapping for NTA Level 9, so the calculator does not produce a result when a Level 9 module is included. Catalogue data and grading rules should be verified against current official IAA sources.

## Fee estimates

The fee planner accepts total course tuition, HESLB tuition allocation, and tuition already paid. It applies the HESLB allocation first, then estimates payments of 40% before admission or registration, 20% before CAT, and 40% before UE. Rounding differences are applied to the final instalment. These estimates do not replace an official IAA fee statement; amounts and due dates may change.

## Deployment

A public GitHub repository makes the source code available; it does not by itself host a working website. To make SmartScholar accessible through a public link, deploy it to a Node.js host and configure the environment for that host.

Production deployments require HTTPS, `NODE_ENV=production`, an HTTPS `APP_BASE_URL`, a strong `SESSION_SECRET`, SMTP credentials, and persistent storage for the SQLite database. The database setup is designed for a single application instance. Multi-instance deployments require a shared database and session/rate-limit storage strategy. Test email delivery, database persistence, backups, and restore procedures in the chosen hosting environment.

## Configuration

See `.env.example` for the available settings:

- `PORT` — web server port.

- `SESSION_SECRET` — secret used to protect session data.

- `DATABASE_PATH` — SQLite database location.

- `APP_BASE_URL` — application URL used in email links.

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` — outbound email provider configuration.

- `BACKUP_DIR` — optional backup directory outside the public web root.

Keep `.env`, database files, and backups out of version control. `.gitignore` excludes these by default.

## Privacy and security

Guest calculations remain in browser memory and are cleared when the page is refreshed or closed. The server maintains a guest session for CSRF protection but does not persist guest calculation contents. CSV files are downloaded only when a user initiates an export.

Verification links expire after 30 minutes. Password-reset links expire after 15 minutes and are single-use; only token hashes are stored. Accounts and session data are stored in SQLite. Before accepting real student information, provide an appropriate privacy notice and account/data management process, secure the hosting environment, configure and test backups, and review applicable privacy requirements.

The application includes baseline security controls, but has not been independently security-certified. Review the implementation and hosting configuration before production use. The in-memory rate limiter is intended for a single instance.

## Project structure

- `server.js` — Express server, account APIs, sessions, and SQLite setup.

- `public/` — web interface, styles, client-side tools, and catalogue data.

- `test/` — smoke tests.

- `DATA_SCHEMA.md` — format for institution and curriculum data.

- `SECURITY.md` — security reporting and deployment guidance.

## License and data attribution

No software license is currently included. Unless a license is added, standard copyright applies and reuse, modification, and redistribution are not granted by this repository. Confirm the applicable rights and attribution requirements for the IAA prospectus-derived catalogue before redistributing it.
