import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { ArbeitsplanPhase, StandardArbeitsplan } from '../types.js';

export const arbeitsplaeneRouter = Router();

function findPlan(id: string): StandardArbeitsplan | undefined {
  return db.data.standardArbeitsplaene.find((plan) => plan.id === id);
}

/** Wandelt null/leeren String in undefined um, damit optionale Felder geleert werden können. */
function clean<T>(value: T | null | undefined | ''): T | undefined {
  return value === null || value === '' || value === undefined ? undefined : value;
}

arbeitsplaeneRouter.get('/', (_req, res) => {
  res.json(db.data.standardArbeitsplaene);
});

arbeitsplaeneRouter.post('/', async (req, res) => {
  const plan: StandardArbeitsplan = {
    id: randomUUID(),
    name: req.body.name,
    beschreibung: req.body.beschreibung,
    phasen: [],
  };
  db.data.standardArbeitsplaene.push(plan);
  await db.write();
  res.status(201).json(plan);
});

arbeitsplaeneRouter.put('/:id', async (req, res) => {
  const plan = findPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Nicht gefunden' });
    return;
  }
  plan.name = req.body.name ?? plan.name;
  plan.beschreibung = req.body.beschreibung ?? plan.beschreibung;
  await db.write();
  res.json(plan);
});

arbeitsplaeneRouter.delete('/:id', async (req, res) => {
  const index = db.data.standardArbeitsplaene.findIndex((plan) => plan.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Nicht gefunden' });
    return;
  }
  db.data.standardArbeitsplaene.splice(index, 1);
  await db.write();
  res.status(204).end();
});

// Phasen verwalten

arbeitsplaeneRouter.post('/:id/phasen', async (req, res) => {
  const plan = findPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Arbeitsplan nicht gefunden' });
    return;
  }
  const phase: ArbeitsplanPhase = {
    id: randomUUID(),
    reihenfolge: plan.phasen.length,
    name: req.body.name,
    dauerTage: req.body.dauerTage,
    typ: req.body.typ ?? 'standard',
    teamId: clean(req.body.teamId),
    kapazitaetsbedarf: clean(req.body.kapazitaetsbedarf),
    anlagenteilId: clean(req.body.anlagenteilId),
  };
  plan.phasen.push(phase);
  await db.write();
  res.status(201).json(phase);
});

arbeitsplaeneRouter.put('/:id/phasen/:phaseId', async (req, res) => {
  const plan = findPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Arbeitsplan nicht gefunden' });
    return;
  }
  const phase = plan.phasen.find((p) => p.id === req.params.phaseId);
  if (!phase) {
    res.status(404).json({ error: 'Phase nicht gefunden' });
    return;
  }
  phase.name = req.body.name ?? phase.name;
  phase.dauerTage = req.body.dauerTage ?? phase.dauerTage;
  phase.typ = req.body.typ ?? phase.typ;
  phase.teamId = clean(req.body.teamId);
  phase.kapazitaetsbedarf = clean(req.body.kapazitaetsbedarf);
  phase.anlagenteilId = clean(req.body.anlagenteilId);
  await db.write();
  res.json(phase);
});

arbeitsplaeneRouter.delete('/:id/phasen/:phaseId', async (req, res) => {
  const plan = findPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Arbeitsplan nicht gefunden' });
    return;
  }
  const index = plan.phasen.findIndex((p) => p.id === req.params.phaseId);
  if (index === -1) {
    res.status(404).json({ error: 'Phase nicht gefunden' });
    return;
  }
  plan.phasen.splice(index, 1);
  plan.phasen.forEach((p, i) => (p.reihenfolge = i));
  await db.write();
  res.status(204).end();
});

// Reihenfolge der Phasen aktualisieren (Drag & Drop)
arbeitsplaeneRouter.put('/:id/phasen-reihenfolge', async (req, res) => {
  const plan = findPlan(req.params.id);
  if (!plan) {
    res.status(404).json({ error: 'Arbeitsplan nicht gefunden' });
    return;
  }
  const order: string[] = req.body.order;
  const map = new Map(plan.phasen.map((p) => [p.id, p]));
  const reordered = order.map((id) => map.get(id)).filter((p): p is ArbeitsplanPhase => !!p);
  reordered.forEach((p, i) => (p.reihenfolge = i));
  plan.phasen = reordered;
  await db.write();
  res.json(plan);
});
