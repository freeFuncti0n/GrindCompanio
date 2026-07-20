# Contributing

Danke für dein Interesse an GrindCompanio!

## Bevor du startest

- Lies [DISCLAIMER.md](DISCLAIMER.md) und [LICENSE](LICENSE).
- Firmware-Änderungen unterliegen **GPL-3.0** (siehe `smart-grind-by-weight/LICENSE`).
- App-Änderungen unterliegen **MIT** (siehe `grind-companion/LICENSE`).

## Pull Requests

1. Fork → Branch → klare Commit-Messages
2. `grind-companion`: `npm run typecheck` und `npm run test:parser`
3. Firmware: `python3 tools/grinder.py build` im Ordner `smart-grind-by-weight/tools`
4. Keine Secrets (.env, Keys, persönliche Pfade) committen

## Upstream-Firmware

Substantielle Firmware-Fixes, die dem Original zugutekommen, können auch an
[jaapp/smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)
weitergegeben werden.

## Code of Conduct

Respektvoller Umgang. Keine Belästigung, kein Spam.
