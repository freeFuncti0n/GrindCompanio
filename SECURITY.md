# Security Policy

## Supported versions

Only the latest `main` branch is actively maintained.

## Reporting a vulnerability

Please **do not** open public issues for security problems.

Instead, use [GitHub Security Advisories](https://github.com/freeFuncti0n/GrindCompanio/security/advisories/new)
or open a private security contact via GitHub if enabled on the repository.

Include:

- Affected component (`grind-companion-webapp` or `smart-grind-by-weight`)
- Steps to reproduce
- Impact assessment (LAN API, OTA, local browser data, hardware safety)

We aim to acknowledge reports within a reasonable timeframe. This is a
hobby/open-source project without a formal SLA.

## Scope notes

- The WiFi LAN API (port 8080) has **no authentication** in v1 — anyone on
  the same LAN can connect. Do not expose the ESP to untrusted networks.
- BLE in the upstream firmware has no pairing encryption — treat the grinder
  radio environment as untrusted.
- OTA firmware updates should only be applied from trusted builds.
