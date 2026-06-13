import { Projekt, Team } from './types.js';
import { addWorkdays, projektEndDatum, vorgangArbeitstage } from './scheduling.js';

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

interface Zeitraum {
  start: string;
  end: string;
}

interface ProjektMitZeitraum {
  projekt: Projekt;
  zeitraum: Zeitraum;
}

function projektZeitraum(projekt: Projekt): Zeitraum | undefined {
  if (projekt.vorgaenge.length === 0) return undefined;
  const end = projektEndDatum(projekt.vorgaenge);
  if (!end) return undefined;
  return { start: projekt.startDatum, end };
}

function intersectsJahr(zeitraum: Zeitraum, jahr: number): boolean {
  return zeitraum.start <= `${jahr}-12-31` && zeitraum.end >= `${jahr}-01-01`;
}

/** Paarweise Überlappungsprüfung der Projektlaufzeiten je Montageplatz. */
function findMontageplatzKonflikte(projekte: ProjektMitZeitraum[]): MontageplatzKonflikt[] {
  const konflikte: MontageplatzKonflikt[] = [];
  for (let i = 0; i < projekte.length; i++) {
    for (let j = i + 1; j < projekte.length; j++) {
      const a = projekte[i];
      const b = projekte[j];
      if (a.projekt.montageplatzId !== b.projekt.montageplatzId) continue;
      const von = a.zeitraum.start > b.zeitraum.start ? a.zeitraum.start : b.zeitraum.start;
      const bis = a.zeitraum.end < b.zeitraum.end ? a.zeitraum.end : b.zeitraum.end;
      if (von > bis) continue;
      konflikte.push({
        montageplatzId: a.projekt.montageplatzId,
        projektA: { id: a.projekt.id, name: a.projekt.name, startDatum: a.zeitraum.start, endDatum: a.zeitraum.end },
        projektB: { id: b.projekt.id, name: b.projekt.name, startDatum: b.zeitraum.start, endDatum: b.zeitraum.end },
        ueberlappungVon: von,
        ueberlappungBis: bis,
      });
    }
  }
  return konflikte;
}

/** Summiert den täglichen Kapazitätsbedarf je Team und meldet Tage, an denen die Teamkapazität überschritten wird. */
function findTeamKonflikte(projekte: Projekt[], teams: Team[], jahr: number): TeamKonflikt[] {
  interface TagEintrag {
    bedarf: number;
    projekte: TeamKonfliktEintrag[];
  }
  const perTeamPerTag = new Map<string, Map<string, TagEintrag>>();

  for (const projekt of projekte) {
    for (const vorgang of projekt.vorgaenge) {
      if (!vorgang.teamId || !vorgang.kapazitaetsbedarf) continue;
      const tage = vorgangArbeitstage(vorgang.startDatum, vorgang.dauerTage);
      for (const tag of tage) {
        if (tag.slice(0, 4) !== String(jahr)) continue;
        let perTag = perTeamPerTag.get(vorgang.teamId);
        if (!perTag) {
          perTag = new Map();
          perTeamPerTag.set(vorgang.teamId, perTag);
        }
        let eintrag = perTag.get(tag);
        if (!eintrag) {
          eintrag = { bedarf: 0, projekte: [] };
          perTag.set(tag, eintrag);
        }
        eintrag.bedarf += vorgang.kapazitaetsbedarf;
        eintrag.projekte.push({ id: projekt.id, name: projekt.name, vorgangName: vorgang.name });
      }
    }
  }

  const konflikte: TeamKonflikt[] = [];
  for (const team of teams) {
    const perTag = perTeamPerTag.get(team.id);
    if (!perTag) continue;
    const tage = [...perTag.keys()].sort();
    let aktuell: TeamKonflikt | undefined;
    for (const tag of tage) {
      const eintrag = perTag.get(tag)!;
      if (eintrag.bedarf <= team.kapazitaetProTag) {
        aktuell = undefined;
        continue;
      }
      const direkteFortsetzung = !!aktuell && addWorkdays(aktuell.bis, 1) === tag;
      if (
        aktuell &&
        direkteFortsetzung &&
        aktuell.bedarf === eintrag.bedarf &&
        JSON.stringify(aktuell.projekte) === JSON.stringify(eintrag.projekte)
      ) {
        aktuell.bis = tag;
      } else {
        aktuell = {
          teamId: team.id,
          von: tag,
          bis: tag,
          bedarf: eintrag.bedarf,
          kapazitaet: team.kapazitaetProTag,
          projekte: eintrag.projekte,
        };
        konflikte.push(aktuell);
      }
    }
  }
  return konflikte;
}

/** Vergleicht je Vorgang mit Anlagenteilbedarf den Starttermin mit dem Liefertermin des projektspezifischen Teils. */
function findMaterialKonflikte(projekte: Projekt[]): MaterialKonflikt[] {
  const konflikte: MaterialKonflikt[] = [];
  for (const projekt of projekte) {
    const anlagenteileById = new Map(projekt.anlagenteile.map((a) => [a.id, a]));
    for (const vorgang of projekt.vorgaenge) {
      if (!vorgang.anlagenteilBedarfId) continue;
      const teil = anlagenteileById.get(vorgang.anlagenteilBedarfId);
      if (!teil) continue;
      if (teil.verfuegbarAb > vorgang.startDatum) {
        konflikte.push({
          projektId: projekt.id,
          projektName: projekt.name,
          vorgangId: vorgang.id,
          vorgangName: vorgang.name,
          anlagenteilName: teil.name,
          benoetigtAb: vorgang.startDatum,
          verfuegbarAb: teil.verfuegbarAb,
        });
      }
    }
  }
  return konflikte;
}

export function findKonflikte(projekte: Projekt[], teams: Team[], jahr: number): Konflikte {
  const mitZeitraum = projekte
    .map((projekt) => ({ projekt, zeitraum: projektZeitraum(projekt) }))
    .filter((p): p is ProjektMitZeitraum => !!p.zeitraum && intersectsJahr(p.zeitraum, jahr));

  const relevanteProjekte = mitZeitraum.map((p) => p.projekt);

  return {
    montageplatz: findMontageplatzKonflikte(mitZeitraum),
    team: findTeamKonflikte(relevanteProjekte, teams, jahr),
    material: findMaterialKonflikte(relevanteProjekte),
  };
}
