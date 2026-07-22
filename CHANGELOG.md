# Changelog

All notable changes to **GrindCompanio** (browser companion) are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Version tags use `vMAJOR.MINOR.PATCH` (e.g. `v1.0.0`).

## [1.0.0] - 2026-07-22

First public release of the GrindCompanio browser companion.

### Added

- Web companion with WiFi REST/WebSocket (Grind, Connect, Analytics)
- **Journal** tab — standalone shot log and recipes (all fields optional)
- TDS input with automatic **SCA extraction yield** (18–22 % zone)
- **Dial-in hit** indicator (shot time, ratio, taste) separate from SCA
- Session journal linkable to grind sessions or fully manual
- Beans library and Diagnose dial recommendations
- German/English i18n, Docker deployment, `docs/DOC.md`
- GitHub Actions release workflow (static zip + Docker image on version tags)
- App version shown in settings menu

### Changed

- README is feature overview only; setup remains in `docs/DOC.md`

[1.0.0]: https://github.com/freeFuncti0n/GrindCompanio/releases/tag/v1.0.0
