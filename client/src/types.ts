export type VorgangTyp = 'standard' | 'sondervorgang' | 'pruefpunkt';

export const VORGANG_TYP_LABEL: Record<VorgangTyp, string> = {
  standard: 'Standard',
  sondervorgang: 'Sondervorgang',
  pruefpunkt: 'Prüfpunkt',
};

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
  endDatum?: string;
}

export interface MontageplatzKonflikt {
  montageplatzId: string;
  projektA: { id: string; name: string; startDatum: string; endDatum: string };
  projektB: { id: string; name: string; startDatum: string; endDatum: string };
  ueberlappungVon: string;
  ueberlappungBis: string;
}

export interface TeamKonfliktEintrag {
  id: string;
  name: string;
  vorgangName: string;
}

export interface TeamKonflikt {
  teamId: string;
  von: string;
  bis: string;
  bedarf: number;
  kapazitaet: number;
  projekte: TeamKonfliktEintrag[];
}

export interface MaterialKonflikt {
  projektId: string;
  projektName: string;
  vorgangId: string;
  vorgangName: string;
  anlagenteilName: string;
  benoetigtAb: string;
  verfuegbarAb: string;
}

export interface Konflikte {
  montageplatz: MontageplatzKonflikt[];
  team: TeamKonflikt[];
  material: MaterialKonflikt[];
}
