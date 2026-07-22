# AGENTS.md

## Cursor Cloud specific instructions

This is a monorepo with two products:

- `grind-companion-webapp/` — React 19 + Vite 8 browser companion (TypeScript). This is the runnable/demonstrable app in a cloud VM.
- `smart-grind-by-weight/` — ESP32-S3 firmware (C++/PlatformIO) + Python BLE tooling. Requires physical hardware and the ESP-IDF/PlatformIO toolchain; it cannot be run or hardware-flashed from the cloud VM. Firmware build/upload commands live in `smart-grind-by-weight/CLAUDE.md`.

### Web app (`grind-companion-webapp/`)

- Standard commands are in `grind-companion-webapp/package.json`: `npm run dev` (Vite dev server on port 5173, `host: true`), `npm run build` (`tsc -b && vite build`), `npm run typecheck`, `npm run preview`. Lint is oxlint: `npx oxlint` (config in `.oxlintrc.json`).
- Non-obvious: the committed `package-lock.json` had missing transitive (optional wasm) deps, so a plain `npm ci` failed. Running `npm install` re-syncs the lockfile. The update script uses `npm install` so it is robust even if the lockfile fix is not merged.
- The app is fully client-side; grind/journal/bean data persists in the browser's IndexedDB (no backend). You can exercise core functionality without an ESP device via the Bean library (`/beans`) and Journal (`/journal`) pages.
- Live grinding and session sync require a real ESP32 running the WiFi firmware on the same LAN (REST on port 8080 + WebSocket). This is not available in the cloud VM, so the Connect/Grind/Sync flows cannot be exercised end-to-end here.
- Docker (`docker compose up -d --build`) only serves the static production build via nginx; use `npm run dev` for development, not Docker.
