import cors from 'cors';
import express from 'express';
import { Montageplatz, Team, Anlagenteil } from './types.js';
import { createCrudRouter } from './routes/crud.js';
import { arbeitsplaeneRouter } from './routes/arbeitsplaene.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/montageplaetze', createCrudRouter<Montageplatz>('montageplaetze'));
app.use('/api/teams', createCrudRouter<Team>('teams'));
app.use('/api/anlagenteile', createCrudRouter<Anlagenteil>('anlagenteile'));
app.use('/api/arbeitsplaene', arbeitsplaeneRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
