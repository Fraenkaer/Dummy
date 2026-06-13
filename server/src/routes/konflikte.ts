import { Router } from 'express';
import { db } from '../db.js';
import { findKonflikte } from '../conflicts.js';

export const konflikteRouter = Router();

konflikteRouter.get('/', (req, res) => {
  const jahrParam = req.query.jahr;
  const jahr = jahrParam ? Number(jahrParam) : new Date().getFullYear();
  if (!Number.isInteger(jahr)) {
    res.status(400).json({ error: 'Ungültiges Jahr' });
    return;
  }
  res.json(findKonflikte(db.data.projekte, db.data.teams, jahr));
});
