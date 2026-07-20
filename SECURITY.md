# Security Policy

## Supported versions

Only the latest `main` branch is actively maintained.

## Reporting a vulnerability

Please **do not** open public issues for security problems.

Instead, use [GitHub Security Advisories](https://github.com/freeFuncti0n/GrindCompanio/security/advisories/new)
or open a private security contact via GitHub if enabled on the repository.

Include:

- Affected component (`grind-companion` or `smart-grind-by-weight`)
- Steps to reproduce
- Impact assessment (BLE, OTA, local data, hardware safety)

We aim to acknowledge reports within a reasonable timeframe. This is a
hobby/open-source project without a formal SLA.

## Scope notes

- BLE has no pairing encryption in the upstream protocol — treat the grinder
  network as untrusted.
- OTA firmware updates should only be applied from trusted builds.
