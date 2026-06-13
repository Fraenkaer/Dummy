import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { Anlagenteil, ArbeitsplanPhase, Montageplatz, StandardArbeitsplan, Team } from './types.js';

/**
 * Beispiel-Stammdaten für die Montage von Turbokompressoren (Engineer-to-Order).
 * Enthält drei Standard-Arbeitspläne, die sich am branchenüblichen Ablauf
 * orientieren:
 *  - Turbokompressor-Montage (Standard): generischer Ablauf vom Wareneingang
 *    bis zur Werksabnahme (FAT).
 *  - Getriebeverdichter 4-stufig (integral verzahnt, Bull Gear mit zwei
 *    Pinions à zwei Laufrädern), mittelgroß.
 *  - Einwellenverdichter 4-stufig (Barrel-Gehäuse, ein gemeinsames
 *    Rotorpaket mit vier Laufrädern, inkl. Hochlauf-Auswuchten).
 *
 * Die Montagehalle ist mit 6 Montageplätzen (allgemeine Montage) und
 * 3 Prüfplätzen (Druckprüfung, Probelauf, Leistungsprüfung/FAT) abgebildet.
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

function ensureArbeitsplan(
  name: string,
  beschreibung: string,
  phasenDefinitionen: Omit<ArbeitsplanPhase, 'id' | 'reihenfolge'>[],
): StandardArbeitsplan {
  let plan = db.data.standardArbeitsplaene.find((p) => p.name === name);
  if (!plan) {
    plan = {
      id: randomUUID(),
      name,
      beschreibung,
      phasen: phasenDefinitionen.map((phase, i) => ({ ...phase, id: randomUUID(), reihenfolge: i })),
    };
    db.data.standardArbeitsplaene.push(plan);
  }
  return plan;
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
const teilGetriebe = ensureAnlagenteil('Getriebe (Großzahnrad)', 'Bull-Gear-Baugruppe mit Hauptwelle, vorgefertigt');
const teilPinion1 = ensureAnlagenteil(
  'Pinion 1 (Stufen 1+2)',
  'Pinionwelle mit Laufrädern Stufe 1 und 2 inkl. Lager und Dichtungen',
);
const teilPinion2 = ensureAnlagenteil(
  'Pinion 2 (Stufen 3+4)',
  'Pinionwelle mit Laufrädern Stufe 3 und 4 inkl. Lager und Dichtungen',
);
const teilZwischenkuehler = ensureAnlagenteil('Zwischenkühler', 'Zwischen- und Nachkühler für die mehrstufige Verdichtung');
const teilRotor = ensureAnlagenteil(
  'Rotor (4-stufig)',
  'Komplettes Rotorpaket (Welle mit 4 Laufrädern, Distanzhülsen, Labyrinthdichtungen), vorgewuchtet',
);
const teilGehaeuseBarrel = ensureAnlagenteil(
  'Verdichtergehäuse (Barrel)',
  'Barrel-Gehäuse mit Leitapparaten/Diffusoren für 4 Stufen, vormontiert',
);

// Montagehalle: 6 Montageplätze (allgemeine Montage) + 3 Prüfplätze
ensureMontageplatz('Montageplatz 1', 'Halle 1, Hallenkran 20 t');
ensureMontageplatz('Montageplatz 2', 'Halle 1, Hallenkran 20 t');
ensureMontageplatz('Montageplatz 3', 'Halle 1, Hallenkran 20 t');
ensureMontageplatz('Montageplatz 4', 'Halle 1, Hallenkran 20 t');
ensureMontageplatz('Montageplatz 5', 'Halle 1, Hallenkran 32 t');
ensureMontageplatz('Montageplatz 6', 'Halle 1, Hallenkran 32 t');
ensureMontageplatz('Prüfplatz 1', 'Halle 1, Prüffeld – Druck- und Dichtigkeitsprüfstand');
ensureMontageplatz('Prüfplatz 2', 'Halle 1, Prüffeld – Probelaufstand mit Antriebs- und Ölversorgungsaggregat');
ensureMontageplatz('Prüfplatz 3', 'Halle 1, Prüffeld – Leistungsprüfstand (FAT) mit Prozessgas-Kreislauf');

// Standardplan 1: generischer Turbokompressor-Ablauf
ensureArbeitsplan(
  'Turbokompressor-Montage (Standard)',
  'Standardablauf für die Montage eines Turbokompressor-Pakets vom Wareneingang bis zur Werksabnahme (ca. 6 Wochen).',
  [
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
  ],
);

// Standardplan 2: Getriebeverdichter, 4-stufig, integral verzahnt (Bull Gear + 2 Pinions), mittelgroß
ensureArbeitsplan(
  'Getriebeverdichter 4-stufig (Standard, mittelgroß)',
  'Standardablauf für die Montage eines mittelgroßen, integral verzahnten 4-stufigen Getriebeverdichters ' +
    '(Großzahnrad mit zwei Pinions à zwei Laufrädern) vom Wareneingang bis zur Werksabnahme (ca. 9 Wochen).',
  [
    {
      name: 'Materialbereitstellung & Wareneingangsprüfung',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamLogistik.id,
      kapazitaetsbedarf: 1,
    },
    {
      name: 'Getriebegehäuse-Grundmontage (Unterteil auf Grundrahmen)',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
    },
    {
      name: 'Großzahnrad-Montage (Bull Gear & Hauptwelle)',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
      anlagenteilId: teilGetriebe.id,
    },
    {
      name: 'Pinion-Montage Stufen 1+2',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
      anlagenteilId: teilPinion1.id,
    },
    {
      name: 'Pinion-Montage Stufen 3+4',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
      anlagenteilId: teilPinion2.id,
    },
    {
      name: 'Gehäusedeckel-Montage & Verzahnungseinstellung',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 4,
    },
    {
      name: 'Zwischen- und Nachkühler-Montage',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamRohrleitungsbau.id,
      kapazitaetsbedarf: 2,
      anlagenteilId: teilZwischenkuehler.id,
    },
    {
      name: 'Rohrleitungs- und Verrohrungsmontage (Sauggas, Druck, Ölsystem)',
      dauerTage: 5,
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
      name: 'Kupplungsmontage & Ausrichtung Antrieb',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 2,
      anlagenteilId: teilAntriebsmotor.id,
    },
    {
      name: 'Mechanischer Probelauf (Verzahnung & Lagerung)',
      dauerTage: 3,
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
  ],
);

// Standardplan 3: Einwellenverdichter, 4-stufig, Barrel-Gehäuse
ensureArbeitsplan(
  'Einwellenverdichter 4-stufig (Standard)',
  'Standardablauf für die Montage eines 4-stufigen Einwellen-Turboverdichters mit Barrel-Gehäuse ' +
    'und gemeinsamem Rotorpaket vom Wareneingang bis zur Werksabnahme (ca. 9 Wochen).',
  [
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
      name: 'Rotormontage (Laufräder, Distanzhülsen, Labyrinthe auf Welle)',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
      anlagenteilId: teilRotor.id,
    },
    {
      name: 'Rotor-Auswuchten (Hochlauf-Auswuchten)',
      dauerTage: 1,
      typ: 'pruefpunkt',
      teamId: teamQS.id,
      kapazitaetsbedarf: 2,
    },
    {
      name: 'Gehäusemontage (Barrel-Unterteil mit Leitapparaten/Diffusoren)',
      dauerTage: 4,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
      anlagenteilId: teilGehaeuseBarrel.id,
    },
    {
      name: 'Rotoreinbau, Lager- und Dichtungsmontage',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
    },
    {
      name: 'Gehäusedeckel-Montage & Verschraubung',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 3,
    },
    {
      name: 'Zwischenkühler-Montage',
      dauerTage: 3,
      typ: 'standard',
      teamId: teamRohrleitungsbau.id,
      kapazitaetsbedarf: 2,
      anlagenteilId: teilZwischenkuehler.id,
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
      name: 'Druck- und Dichtigkeitsprüfung (Barrel-Druckprobe)',
      dauerTage: 2,
      typ: 'pruefpunkt',
      teamId: teamQS.id,
      kapazitaetsbedarf: 2,
    },
    {
      name: 'Kupplungsmontage & Ausrichtung Antrieb',
      dauerTage: 2,
      typ: 'standard',
      teamId: teamMechanik.id,
      kapazitaetsbedarf: 2,
      anlagenteilId: teilAntriebsmotor.id,
    },
    {
      name: 'Mechanischer Probelauf (Schwingungs- & Unwucht-Antwortprüfung)',
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
  ],
);

await db.write();
console.log('Beispiel-Stammdaten angelegt.');
