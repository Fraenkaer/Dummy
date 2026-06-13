import { JSONFilePreset } from 'lowdb/node';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DbSchema, defaultData } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'db.json');

await mkdir(dataDir, { recursive: true });

export const db = await JSONFilePreset<DbSchema>(dbPath, defaultData);
