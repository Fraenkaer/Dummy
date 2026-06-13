import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { Projekt, ProjektAnlagenteil, ProjektVorgang } from '../types.js';
import { clean } from '../util.js';
import { projektEndDatum, recalculateSchedule } from '../scheduling.js';

export const projekteRouter = Router();

function findProjekt(id: string): Projekt | undefined {
  return db.data.projekte.find((p) => p.id === id);
}

function withEndDatum(projekt: Projekt) {
  return { ...projekt, endDatum: projektEndDatum(projekt.vorgaenge) };
}

function reindex(vorgaenge: ProjektVorgang[]) {
  vorgaenge.sort((a, b) => a.reihenfolge - b.reihenfolge).forEach((v, i) => (v.reihenfolge = i));
}

projekteRouter.get('/', (_req, res) => {
  res.json(db.data.projekte.map(withEndDatum));
});

projekteRouter.post('/', async (req, res) => {
  const { name, kunde, startDatum, montageplatzId, arbeitsplanId } = req.body;

  const vorgaenge: ProjektVorgang[] = [];
  const anlagenteile: ProjektAnlagenteil[] = [];
  const anlagenteilZuordnung = new Map<string, string>(); // Katalog-Anlagenteil-Id -> ProjektAnlagenteil-Id

  if (arbeitsplanId) {
    const plan = db.data.standardArbeitsplaene.find((p) => p.id === arbeitsplanId);
    if (!plan) {
      res.status(400).json({ error: 'Arbeitsplan nicht gefunden' });
      return;
    }
    const sortedPhasen = [...plan.phasen].sort((a, b) => a.reihenfolge - b.reihenfolge);
    for (const phase of sortedPhasen) {
      let anlagenteilBedarfId: string | undefined;
      if (phase.anlagenteilId) {
        if (!anlagenteilZuordnung.has(phase.anlagenteilId)) {
          const katalogTeil = db.data.anlagenteile.find((a) => a.id === phase.anlagenteilId);
          const projektTeil: ProjektAnlagenteil = {
            id: randomUUID(),
            name: katalogTeil?.name ?? 'Anlagenteil',
            anlagenteilId: phase.anlagenteilId,
            verfuegbarAb: startDatum,
          };
          anlagenteile.push(projektTeil);
          anlagenteilZuordnung.set(phase.anlagenteilId, projektTeil.id);
        }
        anlagenteilBedarfId = anlagenteilZuordnung.get(phase.anlagenteilId);
      }
      vorgaenge.push({
        id: randomUUID(),
        reihenfolge: vorgaenge.length,
        name: phase.name,
        startDatum,
        dauerTage: phase.dauerTage,
        typ: phase.typ,
        teamId: phase.teamId,
        kapazitaetsbedarf: phase.kapazitaetsbedarf,
        anlagenteilBedarfId,
      });
    }
  }

  recalculateSchedule(vorgaenge, startDatum);

  const projekt: Projekt = {
    id: randomUUID(),
    name,
    kunde: clean(kunde),
    startDatum,
    montageplatzId,
    arbeitsplanId: clean(arbeitsplanId),
    vorgaenge,
    anlagenteile,
  };
  db.data.projekte.push(projekt);
  await db.write();
  res.status(201).json(withEndDatum(projekt));
});

projekteRouter.put('/:id', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  projekt.name = req.body.name ?? projekt.name;
  if (req.body.kunde !== undefined) projekt.kunde = clean(req.body.kunde);
  projekt.montageplatzId = req.body.montageplatzId ?? projekt.montageplatzId;
  if (req.body.startDatum && req.body.startDatum !== projekt.startDatum) {
    projekt.startDatum = req.body.startDatum;
    recalculateSchedule(projekt.vorgaenge, projekt.startDatum);
  }
  await db.write();
  res.json(withEndDatum(projekt));
});

projekteRouter.delete('/:id', async (req, res) => {
  const index = db.data.projekte.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  db.data.projekte.splice(index, 1);
  await db.write();
  res.status(204).end();
});

// Vorgänge

projekteRouter.post('/:id/vorgaenge', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const position: number | undefined = req.body.position;
  const vorgang: ProjektVorgang = {
    id: randomUUID(),
    reihenfolge: 0,
    name: req.body.name,
    startDatum: projekt.startDatum,
    dauerTage: req.body.dauerTage,
    typ: req.body.typ ?? 'standard',
    teamId: clean(req.body.teamId),
    kapazitaetsbedarf: clean(req.body.kapazitaetsbedarf),
    anlagenteilBedarfId: clean(req.body.anlagenteilBedarfId),
  };
  const sorted = [...projekt.vorgaenge].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const insertAt = position === undefined ? sorted.length : Math.max(0, Math.min(position, sorted.length));
  sorted.splice(insertAt, 0, vorgang);
  projekt.vorgaenge = sorted;
  reindex(projekt.vorgaenge);
  recalculateSchedule(projekt.vorgaenge, projekt.startDatum);
  await db.write();
  res.status(201).json(withEndDatum(projekt));
});

projekteRouter.put('/:id/vorgaenge/:vorgangId', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const vorgang = projekt.vorgaenge.find((v) => v.id === req.params.vorgangId);
  if (!vorgang) {
    res.status(404).json({ error: 'Vorgang nicht gefunden' });
    return;
  }
  vorgang.name = req.body.name ?? vorgang.name;
  vorgang.dauerTage = req.body.dauerTage ?? vorgang.dauerTage;
  vorgang.typ = req.body.typ ?? vorgang.typ;
  vorgang.teamId = clean(req.body.teamId);
  vorgang.kapazitaetsbedarf = clean(req.body.kapazitaetsbedarf);
  vorgang.anlagenteilBedarfId = clean(req.body.anlagenteilBedarfId);
  recalculateSchedule(projekt.vorgaenge, projekt.startDatum);
  await db.write();
  res.json(withEndDatum(projekt));
});

projekteRouter.delete('/:id/vorgaenge/:vorgangId', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const index = projekt.vorgaenge.findIndex((v) => v.id === req.params.vorgangId);
  if (index === -1) {
    res.status(404).json({ error: 'Vorgang nicht gefunden' });
    return;
  }
  projekt.vorgaenge.splice(index, 1);
  reindex(projekt.vorgaenge);
  recalculateSchedule(projekt.vorgaenge, projekt.startDatum);
  await db.write();
  res.json(withEndDatum(projekt));
});

projekteRouter.put('/:id/vorgaenge-reihenfolge', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const order: string[] = req.body.order;
  const map = new Map(projekt.vorgaenge.map((v) => [v.id, v]));
  const reordered = order.map((id) => map.get(id)).filter((v): v is ProjektVorgang => !!v);
  reordered.forEach((v, i) => (v.reihenfolge = i));
  projekt.vorgaenge = reordered;
  recalculateSchedule(projekt.vorgaenge, projekt.startDatum);
  await db.write();
  res.json(withEndDatum(projekt));
});

// Anlagenteile (projektspezifische Liefertermine)

projekteRouter.post('/:id/anlagenteile', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const teil: ProjektAnlagenteil = {
    id: randomUUID(),
    name: req.body.name,
    anlagenteilId: clean(req.body.anlagenteilId),
    verfuegbarAb: req.body.verfuegbarAb,
  };
  projekt.anlagenteile.push(teil);
  await db.write();
  res.status(201).json(withEndDatum(projekt));
});

projekteRouter.put('/:id/anlagenteile/:teilId', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const teil = projekt.anlagenteile.find((a) => a.id === req.params.teilId);
  if (!teil) {
    res.status(404).json({ error: 'Anlagenteil nicht gefunden' });
    return;
  }
  teil.name = req.body.name ?? teil.name;
  teil.anlagenteilId = clean(req.body.anlagenteilId);
  teil.verfuegbarAb = req.body.verfuegbarAb ?? teil.verfuegbarAb;
  await db.write();
  res.json(withEndDatum(projekt));
});

projekteRouter.delete('/:id/anlagenteile/:teilId', async (req, res) => {
  const projekt = findProjekt(req.params.id);
  if (!projekt) {
    res.status(404).json({ error: 'Projekt nicht gefunden' });
    return;
  }
  const index = projekt.anlagenteile.findIndex((a) => a.id === req.params.teilId);
  if (index === -1) {
    res.status(404).json({ error: 'Anlagenteil nicht gefunden' });
    return;
  }
  projekt.anlagenteile.splice(index, 1);
  projekt.vorgaenge.forEach((v) => {
    if (v.anlagenteilBedarfId === req.params.teilId) v.anlagenteilBedarfId = undefined;
  });
  await db.write();
  res.json(withEndDatum(projekt));
});
