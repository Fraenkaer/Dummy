import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { DbSchema } from '../types.js';

type CollectionKey = 'montageplaetze' | 'teams' | 'anlagenteile';

/** Einfacher CRUD-Router für flache Stammdaten-Listen (id, name, ...). */
export function createCrudRouter<T extends { id: string }>(key: CollectionKey) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(db.data[key]);
  });

  router.post('/', async (req, res) => {
    const item = { ...req.body, id: randomUUID() } as T;
    (db.data[key] as unknown as T[]).push(item);
    await db.write();
    res.status(201).json(item);
  });

  router.put('/:id', async (req, res) => {
    const list = db.data[key] as unknown as T[];
    const index = list.findIndex((entry) => entry.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Nicht gefunden' });
      return;
    }
    const updated = { ...list[index], ...req.body, id: req.params.id } as T;
    list[index] = updated;
    await db.write();
    res.json(updated);
  });

  router.delete('/:id', async (req, res) => {
    const list = db.data[key] as unknown as T[];
    const index = list.findIndex((entry) => entry.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Nicht gefunden' });
      return;
    }
    list.splice(index, 1);
    await db.write();
    res.status(204).end();
  });

  return router;
}

export type { DbSchema };
