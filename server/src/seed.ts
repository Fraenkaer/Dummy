import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { Anlagenteil, ArbeitsplanPhase, Montageplatz, StandardArbeitsplan, Team } from './types.js';

/**
 * Beispiel-Stammdaten für die Montage von Turbokompressoren (Engineer-to-Order).
 * Phasenfolge orientiert sich am branchenüblichen Ablauf: Skid-/Grundrahmenmontage,
 * Verdichterblock- und Antriebsmontage, Rohrleitungs- und E&I-Montage, Druck-/
 * Dichtigkeitsprüfung, mechanischer Probelauf und Werksabnahme (FAT), Lackierung
 * und Versandvorbereitung.
 */

function ensureTeam(name: string, kapazitaetProTag: number): Team {
  let team = db.data.teams.find((t) => t.name === name);
  if (!team) {
    team = { id: randomUUID(), name, kapazitaetProTag };
    db.data.teams.push(team);
  }
  return team;
}

function ensureAnlagenteil(name: string, beschreibung: string): Anlagenteil {
  let teil = db.data.anlagenteile.find((a) => a.name === name);
  if (!teil) {
    teil = { id: randomUUID(), name, beschreibung };
    db.data.anlagenteile.push(teil);
  }
  return teil;
}

function ensureMontageplatz(name: string, beschreibung: string): Montageplatz {
  let platz = db.data.montageplaetze.find((p) => p.name === name);
  if (!platz) {
    platz = { id: randomUUID(), name, beschreibung };
    db.data.montageplaetze.push(platz);
  }
  return platz;
}

const teamLogistik = ensureTeam('Logistik', 2);
const teamMechanik = ensureTeam('Mechanik', 4);
const teamRohrleitungsbau = ensureTeam('Rohrleitungsbau', 3);
const teamElektrik = ensureTeam('Elektrik', 2);
const teamQS = ensureTeam('Qualitätssicherung', 2);
const teamIBN = ensureTeam('Inbetriebnahme', 2);
const teamLackiererei = ensureTeam('Lackiererei', 2);

const teilVerdichterblock = ensureAnlagenteil('Verdichterblock', 'Vormontierter Verdichterblock inkl. Lagergehäuse');
const teilAntriebsmotor = ensureAnlagenteil('Antriebsmotor', 'E-Motor inkl. Kupplung');
const teilSchaltschrank = ensureAnlagenteil('Schaltschrank', 'E-/MSR-Schaltschrank inkl. Verkabelung');

ensureMontageplatz('Montageplatz 1', 'Halle 1, Hallenkran 20 t');
ensureMontageplatz('Montageplatz 2', 'Halle 1, Hallenkran 20 t');
ensureMontageplatz('Montageplatz 3', 'Halle 2, Hallenkran 10 t');

const PLAN_NAME = 'Turbokompressor-Montage (Standard)';
if (!db.data.standardArbeitsplaene.find((p) => p.name === PLAN_NAME)) {
  const phasenDefinitionen: Omit<ArbeitsplanPhase, 'id' | 'reihenfolge'>[] = [
    {
      name: 'Materialbereitstellung & Wareneingangsprüfung',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamLogistik.id,
      kapazitaetsbedarf: 1,
    },
    {
      name: 'Grundrahmen-/Skid-Montage',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
    },
    {
      name: 'Verdichterblock-Montage',
      dauerTage: 5,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 4,
      anlagenteilId: teilVerdichterblock.id,
    },
    {
      name: 'Antriebsmontage (Motor, Getriebe, Kupplung)',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
      anlagenteilId: teilAntriebsmotor.id,
    },
    {
      name: 'Rohrleitungs- und Verrohrungsmontage',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamRohrleitungsbau.id,
      kapazitaetsbedarf: 3,
    },
    {
      name: 'Elektro- und Instrumentierungsmontage (E&I)',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamElektrik.id,
      kapazitaetsbedarf: 2,
      anlagenteilId: teilSchaltschrank.id,
    },
    {
      name: 'Verkabelung & Anschluss Schaltschrank',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamElektrik.id,
      kapazitaetsbedarf: 2,
    },
    {
      name: 'Druck- und Dichtigkeitsprüfung',
      dauerTage: 1,
      typ: 'pruefpunkt',
      teamId: teamQS.id,
      kapazitaetsbedarf: 2,
    },
    {
      name: 'Mechanischer Probelauf',
      dauerTage: 2,
      typ: 'pruefpunkt',
      teamId: teamIBN.id,
      kapazitaetsbedarf: 2,
    },
    {
      name: 'Leistungsprüfung / Werksabnahme (FAT)',
      dauerTage: 2,
      typ: 'pruefpunkt',
      teamId: teamQS.id,
      kapazitaetsbedarf: 3,
    },
    {
      name: 'Oberflächenschutz / Lackierung',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamLackiererei.id,
      kapazitaetsbedarf: 2,
    },
    {
      name: 'Endreinigung & Verpackung',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamLogistik.id,
      kapazitaetsbedarf: 2,
    },
  ];

  const plan: StandardArbeitsplan = {
    id: randomUUID(),
    name: PLAN_NAME,
    beschreibung:
      'Standardablauf für die Montage eines Turbokompressor-Pakets vom Wareneingang bis zur Werksabnahme (ca. 6 Wochen).',
    phasen: phasenDefinitionen.map((phase, i) => ({ ...phase, id: randomUUID(), reihenfolge: i })),
  };
  db.data.standardArbeitsplaene.push(plan);
}

await db.write();
console.log('Beispiel-Stammdaten angelegt.');
