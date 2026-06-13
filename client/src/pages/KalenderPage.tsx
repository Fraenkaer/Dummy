import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { addDays, formatDate, toIso } from '../scheduling';
import type { Konflikte, Montageplatz, Projekt, Team } from '../types';

const DAY_WIDTH = 6;
const LABEL_WIDTH = 200;
const LANE_HEIGHT = 28;
const ROW_PADDING = 6;

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function isLeapYear(jahr: number): boolean {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0;
}

function daysInYear(jahr: number): number {
  return isLeapYear(jahr) ? 366 : 365;
}

function daysInMonth(jahr: number, monthIndex: number): number {
  return new Date(jahr, monthIndex + 1, 0).getDate();
}

function dayIndex(iso: string, jahr: number): number {
  const d = new Date(`${iso}T00:00:00`);
  const jan1 = new Date(jahr, 0, 1);
  return Math.round((d.getTime() - jan1.getTime()) / 86400000);
}

function monthSegments(jahr: number): { name: string; start: number; days: number }[] {
  const segments: { name: string; start: number; days: number }[] = [];
  let cursor = 0;
  for (let m = 0; m < 12; m++) {
    const days = daysInMonth(jahr, m);
    segments.push({ name: MONTH_NAMES[m], start: cursor, days });
    cursor += days;
  }
  return segments;
}

function weekendDayIndices(jahr: number): number[] {
  const result: number[] = [];
  const total = daysInYear(jahr);
  for (let i = 0; i < total; i++) {
    const day = new Date(jahr, 0, 1 + i).getDay();
    if (day === 0 || day === 6) result.push(i);
  }
  return result;
}

interface ProjektBar {
  projekt: Projekt;
  start: number;
  end: number;
  lane: number;
}

function assignLanes(projekte: Projekt[], jahr: number): { bars: ProjektBar[]; lanes: number } {
  const totalDays = daysInYear(jahr);
  const bars = projekte
    .map((projekt): ProjektBar | null => {
      if (!projekt.endDatum) return null;
      const start = dayIndex(projekt.startDatum, jahr);
      const end = dayIndex(projekt.endDatum, jahr);
      if (end < 0 || start > totalDays - 1) return null;
      return { projekt, start: Math.max(0, start), end: Math.min(totalDays - 1, end), lane: 0 };
    })
    .filter((b): b is ProjektBar => !!b)
    .sort((a, b) => a.start - b.start);

  const laneEnds: number[] = [];
  for (const bar of bars) {
    let lane = laneEnds.findIndex((end) => end < bar.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(bar.end);
    } else {
      laneEnds[lane] = bar.end;
    }
    bar.lane = lane;
  }
  return { bars, lanes: laneEnds.length };
}

interface DragInfo {
  projektId: string;
  startClientX: number;
  originalStartDatum: string;
  originalMontageplatzId: string;
}

interface DragVisual {
  projektId: string;
  deltaDays: number;
  hoverMontageplatzId: string;
}

export default function KalenderPage() {
  const [jahr, setJahr] = useState(new Date().getFullYear());

  return (
    <div className="page">
      <h2>Jahreskalender</h2>

      <div className="kalender-toolbar">
        <button onClick={() => setJahr(jahr - 1)}>← {jahr - 1}</button>
        <strong>{jahr}</strong>
        <button onClick={() => setJahr(jahr + 1)}>{jahr + 1} →</button>
      </div>

      <KalenderAnsicht key={jahr} jahr={jahr} />
    </div>
  );
}

function KalenderAnsicht({ jahr }: { jahr: number }) {
  const [montageplaetze, setMontageplaetze] = useState<Montageplatz[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [konflikte, setKonflikte] = useState<Konflikte>({ montageplatz: [], team: [], material: [] });
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);

  const dragRef = useRef<DragInfo | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  async function loadAll() {
    const [mp, t, p, k] = await Promise.all([
      api.list<Montageplatz>('montageplaetze'),
      api.list<Team>('teams'),
      api.list<Projekt>('projekte'),
      api.get<Konflikte>(`konflikte?jahr=${jahr}`),
    ]);
    setMontageplaetze(mp);
    setTeams(t);
    setProjekte(p);
    setKonflikte(k);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function hoverMontageplatz(clientY: number, fallback: string): string {
      for (const [mpId, el] of rowRefs.current) {
        const rect = el.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) return mpId;
      }
      return fallback;
    }

    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaDays = Math.round((e.clientX - drag.startClientX) / DAY_WIDTH);
      const hoverMontageplatzId = hoverMontageplatz(e.clientY, drag.originalMontageplatzId);
      setDragVisual({ projektId: drag.projektId, deltaDays, hoverMontageplatzId });
    }

    async function onMouseUp(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaDays = Math.round((e.clientX - drag.startClientX) / DAY_WIDTH);
      const hoverMontageplatzId = hoverMontageplatz(e.clientY, drag.originalMontageplatzId);
      dragRef.current = null;
      setDragVisual(null);
      if (deltaDays !== 0 || hoverMontageplatzId !== drag.originalMontageplatzId) {
        await api.update<Projekt>('projekte', drag.projektId, {
          startDatum: addDays(drag.originalStartDatum, deltaDays),
          montageplatzId: hoverMontageplatzId,
        });
        await loadAll();
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(e: React.MouseEvent, projekt: Projekt) {
    e.preventDefault();
    dragRef.current = {
      projektId: projekt.id,
      startClientX: e.clientX,
      originalStartDatum: projekt.startDatum,
      originalMontageplatzId: projekt.montageplatzId,
    };
    setDragVisual({ projektId: projekt.id, deltaDays: 0, hoverMontageplatzId: projekt.montageplatzId });
  }

  function montageplatzName(id: string): string {
    return montageplaetze.find((m) => m.id === id)?.name ?? '–';
  }

  function teamName(id: string): string {
    return teams.find((t) => t.id === id)?.name ?? '–';
  }

  const months = monthSegments(jahr);
  const totalDays = daysInYear(jahr);
  const weekends = weekendDayIndices(jahr);
  const gridWidth = totalDays * DAY_WIDTH;
  const todayIndex = dayIndex(toIso(new Date()), jahr);

  const konfliktProjektIds = new Set<string>();
  konflikte.montageplatz.forEach((k) => {
    konfliktProjektIds.add(k.projektA.id);
    konfliktProjektIds.add(k.projektB.id);
  });
  konflikte.team.forEach((k) => k.projekte.forEach((p) => konfliktProjektIds.add(p.id)));
  konflikte.material.forEach((k) => konfliktProjektIds.add(k.projektId));

  const rows = montageplaetze.map((mp) => {
    const own = projekte.filter((p) => p.montageplatzId === mp.id);
    const { bars, lanes } = assignLanes(own, jahr);
    return { mp, bars, lanes: Math.max(1, lanes) };
  });

  return (
    <>
      <div className="kalender-scroll">
        <div className="kalender-grid" style={{ width: LABEL_WIDTH + gridWidth }}>
          <div className="kalender-monthrow">
            <div className="kalender-row-label" />
            <div className="kalender-monthrow-body" style={{ width: gridWidth }}>
              {months.map((m) => (
                <div key={m.name} className="kalender-month" style={{ left: m.start * DAY_WIDTH, width: m.days * DAY_WIDTH }}>
                  {m.name}
                </div>
              ))}
            </div>
          </div>

          {rows.map(({ mp, bars, lanes }) => (
            <div
              className="kalender-row"
              key={mp.id}
              ref={(el) => {
                if (el) rowRefs.current.set(mp.id, el);
                else rowRefs.current.delete(mp.id);
              }}
            >
              <div
                className={
                  'kalender-row-label' + (dragVisual?.hoverMontageplatzId === mp.id ? ' kalender-row-hover' : '')
                }
              >
                {mp.name}
              </div>
              <div
                className="kalender-row-body"
                style={{ width: gridWidth, height: lanes * LANE_HEIGHT + ROW_PADDING * 2 }}
              >
                {weekends.map((w) => (
                  <div key={w} className="kalender-weekend" style={{ left: w * DAY_WIDTH, width: DAY_WIDTH }} />
                ))}
                {todayIndex >= 0 && todayIndex < totalDays && (
                  <div className="kalender-today" style={{ left: todayIndex * DAY_WIDTH }} />
                )}
                {bars.map(({ projekt, start, end, lane }) => {
                  const isDragging = dragVisual?.projektId === projekt.id;
                  const left = start * DAY_WIDTH + (isDragging ? dragVisual!.deltaDays * DAY_WIDTH : 0);
                  const width = (end - start + 1) * DAY_WIDTH;
                  const konfliktKlasse = konfliktProjektIds.has(projekt.id) ? ' kalender-bar-konflikt' : '';
                  return (
                    <div
                      key={projekt.id}
                      className={'kalender-bar' + konfliktKlasse + (isDragging ? ' kalender-bar-dragging' : '')}
                      style={{ left, width, top: ROW_PADDING + lane * LANE_HEIGHT, height: LANE_HEIGHT - 4 }}
                      title={`${projekt.name}${projekt.kunde ? ` (${projekt.kunde})` : ''} · ${formatDate(
                        projekt.startDatum,
                      )} – ${formatDate(projekt.endDatum)}`}
                      onMouseDown={(e) => startDrag(e, projekt)}
                    >
                      {projekt.name}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="kalender-konflikte">
        <h3>Konflikte {jahr}</h3>

        <h4>Montageplatz-Konflikte</h4>
        {konflikte.montageplatz.length === 0 ? (
          <p className="muted">Keine Überlappungen.</p>
        ) : (
          <ul>
            {konflikte.montageplatz.map((k, i) => (
              <li key={i}>
                <strong>{montageplatzName(k.montageplatzId)}</strong>: „{k.projektA.name}“ (
                {formatDate(k.projektA.startDatum)}–{formatDate(k.projektA.endDatum)}) überlappt mit „
                {k.projektB.name}“ ({formatDate(k.projektB.startDatum)}–{formatDate(k.projektB.endDatum)}) im
                Zeitraum {formatDate(k.ueberlappungVon)}–{formatDate(k.ueberlappungBis)}.
              </li>
            ))}
          </ul>
        )}

        <h4>Team-Kapazität</h4>
        {konflikte.team.length === 0 ? (
          <p className="muted">Keine Überlastungen.</p>
        ) : (
          <ul>
            {konflikte.team.map((k, i) => (
              <li key={i}>
                <strong>{teamName(k.teamId)}</strong>: {formatDate(k.von)}–{formatDate(k.bis)} – Bedarf {k.bedarf} &gt;
                Kapazität {k.kapazitaet}. Betroffen: {k.projekte.map((p) => `${p.name} (${p.vorgangName})`).join(', ')}
              </li>
            ))}
          </ul>
        )}

        <h4>Material-Verfügbarkeit</h4>
        {konflikte.material.length === 0 ? (
          <p className="muted">Keine Engpässe.</p>
        ) : (
          <ul>
            {konflikte.material.map((k, i) => (
              <li key={i}>
                <strong>{k.projektName}</strong>: Vorgang „{k.vorgangName}“ benötigt „{k.anlagenteilName}“ ab{' '}
                {formatDate(k.benoetigtAb)}, verfügbar erst ab {formatDate(k.verfuegbarAb)}.
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
