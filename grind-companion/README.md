# Grind Companion (Expo)

iOS/iPad companion app for [smart-grind-by-weight](../smart-grind-by-weight).

## Features

- **Connect** – BLE scan/pair with `GrindByWeight`
- **Sync** – Export session files over the existing Data Export GATT service (no desktop Python needed)
- **Analytics** – Session list + detail charts (weight/flow) on device
- **Grind** – Dark AMOLED-style Arc/Chart UI matching the ESP display theme
- **Live** (Phase 2 firmware) – Real-time weight/flow/phase while grinding

## Requirements

- Expo Dev Client (BLE does **not** work in Expo Go)
- Physical iPhone/iPad + Mac for iOS builds, or Android device
- Grinder with BLE enabled; logging on for analytics (`Menu → Logs & Data`)

## Setup

```bash
cd grind-companion
npm install
npx expo prebuild
npx expo run:ios
# or: npx expo run:android
```

## Web-Vorschau

```bash
npm run web
```

Auf Web wird SQLite durch Demo-Daten ersetzt (`src/db/database.web.ts`), damit der WASM-Fehler entfällt. BLE bleibt auf Web deaktiviert.


Colors and radii live in `src/theme.ts` (mirrored from ESP `src/config/theme.h`). Edit there for Cursor GUI changes.

## BLE protocol

See firmware `src/config/bluetooth.h` and Python reference `tools/ble/grinder-ble.py`.

Live telemetry (Phase 2): service `aabbccdd-eeff-0011-2233-445566778899`, 20-byte LE payload notify at ~20 Hz while grinding after control `0x01`.
