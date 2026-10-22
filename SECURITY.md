# Security policy

SmartScholar is maintained as an open-source student toolkit. Security reports are welcome. Please report suspected vulnerabilities privately to the repository maintainers rather than posting details in a public issue. Add a monitored security contact to this file before inviting reports.

## Deployment security

Production deployments should use HTTPS, secure cookies, a strong session secret, and a configured SMTP provider. Verification and password-reset tokens must not appear in logs. Store the SQLite database on persistent storage and maintain encrypted backups with tested restore procedures.

Before collecting real student information, review authentication, authorization, CSRF protections, input validation, rate limits, session handling, logging, data retention, privacy notices, and account deletion/export processes. Run dependency and application security reviews appropriate to the deployment.

The current database and in-memory rate limiter are intended for a single application instance. A multi-instance deployment requires shared persistent database, session, and rate-limit services.
