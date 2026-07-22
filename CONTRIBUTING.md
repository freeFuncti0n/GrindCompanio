# Contributing

Danke für dein Interesse an GrindCompanio!

## Bevor du startest

- Lies [DISCLAIMER.md](DISCLAIMER.md) und [LICENSE](LICENSE).
- Firmware-Änderungen unterliegen **GPL-3.0** (siehe `smart-grind-by-weight/LICENSE`).
- Web-App-Änderungen unterliegen **MIT** (siehe `grind-companion-webapp/LICENSE`).

## Pull Requests

1. Fork → Branch → klare Commit-Messages
2. Web-App: `cd grind-companion-webapp && npm run typecheck && npm run build`
3. Firmware: `python3 tools/grinder.py build` im Ordner `smart-grind-by-weight/tools`
4. Keine Secrets (.env, WLAN-Passwörter in `wifi_credentials.h`, persönliche Pfade) committen

## Upstream-Firmware

Substantielle Firmware-Fixes, die dem Original zugutekommen, können auch an
[jaapp/smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)
weitergegeben werden.

## Code of Conduct

Respektvoller Umgang. Keine Belästigung, kein Spam.
