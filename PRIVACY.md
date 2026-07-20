# Datenschutz (Grind Companion App)

Stand: 2026

## Kurzfassung

Die Grind-Companion-App speichert Daten **lokal auf deinem Gerät**.
Es gibt **keinen Cloud-Backend-Server** dieses Projekts und **kein Tracking**
durch die App-Autoren.

## Welche Daten verarbeitet werden?

| Daten | Wo | Zweck |
|-------|-----|--------|
| Mahl-Sessions (Gewicht, Flow, Zeiten) | Lokale SQLite | Analytics, Journal |
| Espresso-Tagebuch (Bohne, Dial, Notizen) | Lokale SQLite | Auswertung, Diagnose |
| BLE-Verbindung zum ESP | Nur Gerät ↔ Mühle | Sync, Live-Telemetrie |

## Was wird nicht gemacht?

- Kein Upload an Server des Projektautors
- Kein Analytics-/Crash-Reporting SDK (Stand dieser Codebasis)
- Keine Weitergabe an Dritte durch die App selbst

## Bluetooth

Die App scannt nach BLE-Geräten mit Namen wie „GrindByWeight“ und verbindet
sich nur bei deiner Aktion. iOS/Android verlangen ggf. Bluetooth-Berechtigungen;
deren Verarbeitung unterliegt den Richtlinien von Apple/Google.

## Web-Vorschau (`npm run web`)

Im Browser werden **Demo-Daten** verwendet; BLE ist deaktiviert.

## Deine Rechte

Du kannst alle lokalen Daten löschen durch Deinstallation der App oder
Löschen der App-Daten auf dem Gerät.

## Kontakt

Projekt: https://github.com/freeFuncti0n/GrindCompanio

Bei Fragen zum Datenschutz: Issue im GitHub-Repository eröffnen.
