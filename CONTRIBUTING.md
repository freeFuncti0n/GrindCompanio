# Contributing

Thanks for your interest in GrindCompanio!

## Before you start

- Read [DISCLAIMER.md](DISCLAIMER.md) and [LICENSE](LICENSE).
- Firmware changes are under **GPL-3.0** (see `smart-grind-by-weight/LICENSE`).
- Web app changes are under **MIT** (see `grind-companion-webapp/LICENSE`).

## Pull Requests

1. Fork → branch → clear commit messages
2. Web app: `cd grind-companion-webapp && npm run typecheck && npm run build`
3. Firmware: `python3 tools/grinder.py build` in `smart-grind-by-weight/tools`
4. Do not commit secrets (`.env`, Wi‑Fi passwords in `wifi_credentials.h`, personal paths)

## Upstream firmware

Substantial firmware fixes that benefit the original project can also be
submitted upstream to
[jaapp/smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight).

## Code of Conduct

Be respectful. No harassment, no spam.
