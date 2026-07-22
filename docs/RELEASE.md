# Release guide

GrindCompanio uses **semantic versioning** for the **browser companion** (`grind-companion-webapp`).

| Artifact | Version source | Tag example |
|----------|----------------|-------------|
| Web app + Docker | root `VERSION` + `grind-companion-webapp/package.json` | `v1.0.0` |
| Firmware | separate (Jaapp base **v1.4.0** + WiFi fork) | prebuilt in `smart-grind-by-weight/release/` |

Firmware and web app versions are **independent**. This document covers the **web companion** only.

---

## Version files

- [`VERSION`](../VERSION) — single source of truth for releases
- [`grind-companion-webapp/package.json`](../grind-companion-webapp/package.json) — must match `VERSION`
- [`CHANGELOG.md`](../CHANGELOG.md) — release notes per version

---

## Publish a release to GitHub

### 1. Prepare

1. Ensure `VERSION` and `package.json` show the target version (e.g. `1.0.0`).
2. Update `CHANGELOG.md` with the new section.
3. Commit all changes on `main`.

### 2. Tag and push

```bash
git tag -a v1.0.0 -m "GrindCompanio web companion v1.0.0"
git push origin main
git push origin v1.0.0
```

Pushing a tag matching `v*` triggers [`.github/workflows/release-webapp.yml`](../.github/workflows/release-webapp.yml).

### 3. What the workflow builds

| Output | Description |
|--------|-------------|
| **GitHub Release** | Draft release with notes from `CHANGELOG.md` |
| **`grind-companion-webapp-X.Y.Z.zip`** | Static `dist/` — host on any web server |
| **Docker image** | `ghcr.io/<owner>/grindcompanio:X.Y.Z` and `:latest` |

### 4. Publish the draft

1. Open [GitHub Releases](https://github.com/freeFuncti0n/GrindCompanio/releases).
2. Review the draft for `v1.0.0`.
3. Click **Publish release**.

### 5. Deploy

**Docker (NAS / server):**

```bash
docker pull ghcr.io/freefuncti0n/grindcompanio:1.0.0
cd grind-companion-webapp
WEB_PORT=8088 docker compose up -d
# or pin image in compose: image: ghcr.io/freefuncti0n/grindcompanio:1.0.0
```

**Static zip:** unzip and serve the folder with any HTTP server (nginx, Caddy, etc.).

See [`docs/DOC.md`](DOC.md) for full setup (firmware flash → Docker → first use).

---

## Local build (without GitHub)

```bash
cd grind-companion-webapp
npm ci
npm run build
# → dist/
```

Docker locally:

```bash
cd grind-companion-webapp
docker compose build
docker compose up -d
```

---

## Pre-releases

Tags containing `-rc.`, `-alpha`, or `-beta` are marked as **pre-releases** on GitHub.

Example: `v1.3.0-rc.1`
