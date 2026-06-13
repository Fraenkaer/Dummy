// Gemeinsames Datenmodell für die Montageplanung

export type VorgangTyp = 'standard' | 'sondervorgang' | 'pruefpunkt';

export interface Montageplatz {
  id: string;
  name: string;
  beschreibung?: string;
}

export interface Team {
  id: string;
  name: string;
  kapazitaetProTag: number;
}

export interface Anlagenteil {
  id: string;
  name: string;
  beschreibung?: string;
}

export interface ArbeitsplanPhase {
  id: string;
  reihenfolge: number;
  name: string;
  dauerTage: number;
  typ: VorgangTyp;
  teamId?: string;
  kapazitaetsbedarf?: number;
  anlagenteilId?: string;
}

export interface StandardArbeitsplan {
  id: string;
  name: string;
  beschreibung?: string;
  phasen: ArbeitsplanPhase[];
}

export interface ProjektVorgang {
  id: string;
  reihenfolge: number;
  name: string;
  startDatum: string;
  dauerTage: number;
  typ: VorgangTyp;
  teamId?: string;
  kapazitaetsbedarf?: number;
  anlagenteilBedarfId?: string;
}

export interface ProjektAnlagenteil {
  id: string;
  name: string;
  anlagenteilId?: string;
  verfuegbarAb: string;
}

export interface Projekt {
  id: string;
  name: string;
  kunde?: string;
  startDatum: string;
  montageplatzId: string;
  arbeitsplanId?: string;
  vorgaenge: ProjektVorgang[];
  anlagenteile: ProjektAnlagenteil[];
}

export interface DbSchema {
  montageplaetze: Montageplatz[];
  teams: Team[];
  anlagenteile: Anlagenteil[];
  standardArbeitsplaene: StandardArbeitsplan[];
  projekte: Projekt[];
}

export const defaultData: DbSchema = {
  montageplaetze: [],
  teams: [],
  anlagenteile: [],
  standardArbeitsplaene: [],
  projekte: [],
};
