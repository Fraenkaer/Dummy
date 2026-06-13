# Montageplanung

Software zur Jahresplanung der Montage von Sondermaschinen: Standard-Arbeitspläne
als Vorlagen anlegen, Projekte auf Montageplätze einplanen und Konflikte
(Personal, Platz, Anlagenteile) erkennen.

## Setup

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend-API: http://localhost:3001 (wird vom Frontend per Proxy unter `/api` angesprochen)

Die Daten werden lokal in `server/data/db.json` gespeichert (wird automatisch angelegt).

## Struktur

- `client/` – React/TypeScript-Frontend (Vite)
- `server/` – Node/Express-Backend mit Datei-Persistenz (lowdb)

## Stand

Aktuell umgesetzt: Stammdatenverwaltung für Montageplätze, Teams,
Anlagenteile/Vorprodukte und Standard-Arbeitspläne (mit Phasen).

Geplant: Projekte aus Vorlagen erstellen, Jahreskalender mit
Drag&Drop-Planung, automatische Konflikterkennung (Montageplatz,
Team-Kapazität, Materialverfügbarkeit), Sondervorgänge/Prüfpunkte,
Import (MS Project XML) und generische Datei-Schnittstelle als
Vorbereitung für eine spätere SAP-Anbindung.
