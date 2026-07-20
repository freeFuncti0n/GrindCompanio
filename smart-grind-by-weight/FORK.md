# Firmware Fork Notice

This directory contains firmware derived from
[smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)
by jaapp and contributors.

## License

- **Software source code:** GNU General Public License v3.0 or later
- **Hardware designs (STL, etc.):** CERN Open Hardware Licence v2 — Strongly Reciprocal

See [LICENSE](LICENSE) in this directory for the full text.

## Changes in this fork (GrindCompanio)

Extensions maintained in the GrindCompanio monorepo include, among others:

- BLE Live telemetry service (~20 Hz while grinding)
- Remote grind control commands (`0x10`–`0x13` on Live Control characteristic)
- UI-task delegation for remote start (preserves `ui_acknowledge_phase_transition`)
- Idle guards and purge-confirm remote handling

## Source availability

Complete corresponding source code is available in this repository under the
same license as the upstream project requires for modified versions.
