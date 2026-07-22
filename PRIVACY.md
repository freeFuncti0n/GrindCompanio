# Datenschutz (Grind Companion Web)

Stand: 2026

## Kurzfassung

Die **Web-App** speichert Daten **lokal im Browser** (IndexedDB). Es gibt
**keinen Cloud-Backend-Server** dieses Projekts und **kein Tracking**
durch die Projektautoren.

## Welche Daten verarbeitet werden?

| Daten | Wo | Zweck |
|-------|-----|--------|
| Mahl-Sessions (Gewicht, Flow, Zeiten) | IndexedDB im Browser | Analytics, Session-Details |
| Espresso-Tagebuch (Bohne, Dial, Notizen) | IndexedDB im Browser | Auswertung, Diagnose |
| ESP-IP-Adresse | `localStorage` im Browser | Verbindung zum Mühlen-ESP |
| Sprache (DE/EN) | `localStorage` im Browser | UI-Sprache |

## Netzwerk

Die Web-App spricht **direkt** mit deinem ESP im lokalen WLAN (HTTP Port 8080,
WebSocket für Live-Daten). Dieser Datenverkehr läuft **nicht** über Server des
Projektautors — nur zwischen Browser und Mühle im LAN.

Wenn die UI auf einer NAS gehostet wird, lädt der Browser nur statische Dateien
(HTML/JS/CSS) von dort. Die API-Anfragen gehen weiterhin direkt an den ESP.

## Was wird nicht gemacht?

- Kein Upload an Server des Projektautors
- Kein Analytics-/Crash-Reporting SDK (Stand dieser Codebasis)
- Keine Weitergabe an Dritte durch die Web-App selbst

## Firmware & BLE

Die ESP-Firmware kann weiterhin **Bluetooth** nutzen (OTA, Export am Gerät).
Die Web-App verwendet **WiFi**, nicht BLE. Bluetooth-Berechtigungen des
Browsers sind für diese Web-App nicht erforderlich.

## Deine Rechte

Du kannst alle lokalen Daten löschen durch:

- Löschen der Website-Daten / IndexedDB im Browser
- oder privates Fenster ohne Persistenz nutzen

## Kontakt

Projekt: https://github.com/freeFuncti0n/GrindCompanio

Bei Fragen zum Datenschutz: Issue im GitHub-Repository eröffnen.
