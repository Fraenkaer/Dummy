import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { formatDate, lastWorkday, toIso } from '../scheduling';
import {
  VORGANG_TYP_LABEL,
  type Anlagenteil,
  type Montageplatz,
  type Projekt,
  type ProjektAnlagenteil,
  type ProjektVorgang,
  type StandardArbeitsplan,
  type Team,
  type VorgangTyp,
} from '../types';

interface NeuesProjektForm {
  name: string;
  kunde: string;
  montageplatzId: string;
  startDatum: string;
  arbeitsplanId: string;
}

const emptyNeuesProjekt: NeuesProjektForm = {
  name: '',
  kunde: '',
  montageplatzId: '',
  startDatum: toIso(new Date()),
  arbeitsplanId: '',
};

interface DetailsForm {
  name: string;
  kunde: string;
  montageplatzId: string;
  startDatum: string;
}

interface VorgangForm {
  name: string;
  dauerTage: number;
  typ: VorgangTyp;
  teamId: string;
  kapazitaetsbedarf: number;
  anlagenteilBedarfId: string;
  position: number;
}

const emptyVorgangForm: VorgangForm = {
  name: '',
  dauerTage: 1,
  typ: 'sondervorgang',
  teamId: '',
  kapazitaetsbedarf: 1,
  anlagenteilBedarfId: '',
  position: 0,
};

interface AnlagenteilForm {
  name: string;
  anlagenteilId: string;
  verfuegbarAb: string;
}

const emptyAnlagenteilForm: AnlagenteilForm = {
  name: '',
  anlagenteilId: '',
  verfuegbarAb: toIso(new Date()),
};

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [montageplaetze, setMontageplaetze] = useState<Montageplatz[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [anlagenteile, setAnlagenteile] = useState<Anlagenteil[]>([]);
  const [arbeitsplaene, setArbeitsplaene] = useState<StandardArbeitsplan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [neuesProjekt, setNeuesProjekt] = useState<NeuesProjektForm>(emptyNeuesProjekt);

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState<DetailsForm>({
    name: '',
    kunde: '',
    montageplatzId: '',
    startDatum: '',
  });

  const [vorgangForm, setVorgangForm] = useState<VorgangForm>(emptyVorgangForm);
  const [editingVorgangId, setEditingVorgangId] = useState<string | null>(null);

  const [anlagenteilForm, setAnlagenteilForm] = useState<AnlagenteilForm>(emptyAnlagenteilForm);
  const [editingAnlagenteilId, setEditingAnlagenteilId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [p, m, t, a, ap] = await Promise.all([
      api.list<Projekt>('projekte'),
      api.list<Montageplatz>('montageplaetze'),
      api.list<Team>('teams'),
      api.list<Anlagenteil>('anlagenteile'),
      api.list<StandardArbeitsplan>('arbeitsplaene'),
    ]);
    setProjekte(p);
    setMontageplaetze(m);
    setTeams(t);
    setAnlagenteile(a);
    setArbeitsplaene(ap);
  }

  const selectedProjekt = projekte.find((p) => p.id === selectedId) ?? null;

  function montageplatzName(id?: string) {
    return montageplaetze.find((m) => m.id === id)?.name ?? '–';
  }

  function teamName(id?: string) {
    return teams.find((t) => t.id === id)?.name ?? '–';
  }

  function anlagenteilName(id?: string) {
    return anlagenteile.find((a) => a.id === id)?.name ?? '–';
  }

  function projektAnlagenteilName(id?: string) {
    return selectedProjekt?.anlagenteile.find((a) => a.id === id)?.name ?? '–';
  }

  // Projekte

  async function createProjekt(e: FormEvent) {
    e.preventDefault();
    if (!neuesProjekt.name.trim() || !neuesProjekt.montageplatzId) return;
    const projekt = await api.create<Projekt>('projekte', {
      name: neuesProjekt.name,
      kunde: neuesProjekt.kunde,
      startDatum: neuesProjekt.startDatum,
      montageplatzId: neuesProjekt.montageplatzId,
      arbeitsplanId: neuesProjekt.arbeitsplanId,
    });
    setNeuesProjekt(emptyNeuesProjekt);
    await loadAll();
    setSelectedId(projekt.id);
  }

  async function deleteProjekt(id: string) {
    if (!confirm('Projekt wirklich löschen?')) return;
    await api.remove('projekte', id);
    if (selectedId === id) setSelectedId(null);
    await loadAll();
  }

  function selectProjekt(id: string) {
    setSelectedId(id);
    setEditingDetails(false);
    setEditingVorgangId(null);
    const projekt = projekte.find((p) => p.id === id);
    setVorgangForm({ ...emptyVorgangForm, position: projekt?.vorgaenge.length ?? 0 });
    setEditingAnlagenteilId(null);
    setAnlagenteilForm(emptyAnlagenteilForm);
  }

  function startEditDetails() {
    if (!selectedProjekt) return;
    setDetailsForm({
      name: selectedProjekt.name,
      kunde: selectedProjekt.kunde ?? '',
      montageplatzId: selectedProjekt.montageplatzId,
      startDatum: selectedProjekt.startDatum,
    });
    setEditingDetails(true);
  }

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    if (!selectedProjekt) return;
    await api.update('projekte', selectedProjekt.id, detailsForm);
    setEditingDetails(false);
    await loadAll();
  }

  // Vorgänge

  const sortedVorgaenge = selectedProjekt
    ? [...selectedProjekt.vorgaenge].sort((a, b) => a.reihenfolge - b.reihenfolge)
    : [];

  async function submitVorgang(e: FormEvent) {
    e.preventDefault();
    if (!selectedProjekt) return;
    const body = {
      name: vorgangForm.name,
      dauerTage: Number(vorgangForm.dauerTage),
      typ: vorgangForm.typ,
      teamId: vorgangForm.teamId || null,
      kapazitaetsbedarf: Number(vorgangForm.kapazitaetsbedarf),
      anlagenteilBedarfId: vorgangForm.anlagenteilBedarfId || null,
    };
    if (editingVorgangId) {
      await api.update(`projekte/${selectedProjekt.id}/vorgaenge`, editingVorgangId, body);
    } else {
      await api.create(`projekte/${selectedProjekt.id}/vorgaenge`, {
        ...body,
        position: vorgangForm.position,
      });
    }
    setVorgangForm({ ...emptyVorgangForm, position: sortedVorgaenge.length });
    setEditingVorgangId(null);
    await loadAll();
  }

  function startEditVorgang(vorgang: ProjektVorgang) {
    setEditingVorgangId(vorgang.id);
    setVorgangForm({
      name: vorgang.name,
      dauerTage: vorgang.dauerTage,
      typ: vorgang.typ,
      teamId: vorgang.teamId ?? '',
      kapazitaetsbedarf: vorgang.kapazitaetsbedarf ?? 1,
      anlagenteilBedarfId: vorgang.anlagenteilBedarfId ?? '',
      position: 0,
    });
  }

  function cancelEditVorgang() {
    setEditingVorgangId(null);
    setVorgangForm({ ...emptyVorgangForm, position: sortedVorgaenge.length });
  }

  async function deleteVorgang(vorgangId: string) {
    if (!selectedProjekt) return;
    if (!confirm('Vorgang wirklich löschen?')) return;
    await api.remove(`projekte/${selectedProjekt.id}/vorgaenge`, vorgangId);
    await loadAll();
  }

  async function moveVorgang(sorted: ProjektVorgang[], index: number, direction: -1 | 1) {
    if (!selectedProjekt) return;
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await api.put<Projekt>(`projekte/${selectedProjekt.id}/vorgaenge-reihenfolge`, {
      order: reordered.map((v) => v.id),
    });
    await loadAll();
  }

  // Anlagenteile

  async function submitAnlagenteil(e: FormEvent) {
    e.preventDefault();
    if (!selectedProjekt) return;
    const body = {
      name: anlagenteilForm.name,
      anlagenteilId: anlagenteilForm.anlagenteilId || null,
      verfuegbarAb: anlagenteilForm.verfuegbarAb,
    };
    if (editingAnlagenteilId) {
      await api.update(`projekte/${selectedProjekt.id}/anlagenteile`, editingAnlagenteilId, body);
    } else {
      await api.create(`projekte/${selectedProjekt.id}/anlagenteile`, body);
    }
    setAnlagenteilForm(emptyAnlagenteilForm);
    setEditingAnlagenteilId(null);
    await loadAll();
  }

  function startEditAnlagenteil(teil: ProjektAnlagenteil) {
    setEditingAnlagenteilId(teil.id);
    setAnlagenteilForm({
      name: teil.name,
      anlagenteilId: teil.anlagenteilId ?? '',
      verfuegbarAb: teil.verfuegbarAb,
    });
  }

  function cancelEditAnlagenteil() {
    setEditingAnlagenteilId(null);
    setAnlagenteilForm(emptyAnlagenteilForm);
  }

  async function deleteAnlagenteil(teilId: string) {
    if (!selectedProjekt) return;
    if (!confirm('Anlagenteil wirklich löschen?')) return;
    await api.remove(`projekte/${selectedProjekt.id}/anlagenteile`, teilId);
    await loadAll();
  }

  return (
    <div className="page">
      <h2>Projekte</h2>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Kunde</th>
            <th>Montageplatz</th>
            <th>Start</th>
            <th>Ende</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {projekte.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Noch keine Projekte.
              </td>
            </tr>
          )}
          {projekte.map((p) => (
            <tr key={p.id}>
              <td>
                <button
                  onClick={() => selectProjekt(p.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    textAlign: 'left',
                    width: '100%',
                    fontWeight: p.id === selectedId ? 600 : 400,
                    color: p.id === selectedId ? 'var(--accent)' : 'inherit',
                  }}
                >
                  {p.name}
                </button>
              </td>
              <td>{p.kunde || '–'}</td>
              <td>{montageplatzName(p.montageplatzId)}</td>
              <td>{formatDate(p.startDatum)}</td>
              <td>{formatDate(p.endDatum)}</td>
              <td className="actions-cell">
                <button className="danger" onClick={() => deleteProjekt(p.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="form" onSubmit={createProjekt}>
        <h3>Neues Projekt</h3>
        <label>
          Name
          <input
            value={neuesProjekt.name}
            onChange={(e) => setNeuesProjekt({ ...neuesProjekt, name: e.target.value })}
            required
          />
        </label>
        <label>
          Kunde
          <input
            value={neuesProjekt.kunde}
            onChange={(e) => setNeuesProjekt({ ...neuesProjekt, kunde: e.target.value })}
          />
        </label>
        <div className="row">
          <label>
            Montageplatz
            <select
              value={neuesProjekt.montageplatzId}
              onChange={(e) => setNeuesProjekt({ ...neuesProjekt, montageplatzId: e.target.value })}
              required
            >
              <option value="">– bitte wählen –</option>
              {montageplaetze.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Startdatum
            <input
              type="date"
              value={neuesProjekt.startDatum}
              onChange={(e) => setNeuesProjekt({ ...neuesProjekt, startDatum: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          Standard-Arbeitsplan
          <select
            value={neuesProjekt.arbeitsplanId}
            onChange={(e) => setNeuesProjekt({ ...neuesProjekt, arbeitsplanId: e.target.value })}
          >
            <option value="">– ohne Vorlage –</option>
            {arbeitsplaene.map((ap) => (
              <option key={ap.id} value={ap.id}>
                {ap.name}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="submit" className="primary">
            Anlegen
          </button>
        </div>
      </form>

      {selectedProjekt && (
        <div style={{ marginTop: 32 }}>
          {!editingDetails ? (
            <div style={{ marginBottom: 16 }}>
              <h3>{selectedProjekt.name}</h3>
              <p className="muted">
                {selectedProjekt.kunde ? `${selectedProjekt.kunde} · ` : ''}
                {montageplatzName(selectedProjekt.montageplatzId)} · Start:{' '}
                {formatDate(selectedProjekt.startDatum)} · Ende: {formatDate(selectedProjekt.endDatum)}
              </p>
              <button onClick={startEditDetails}>Details bearbeiten</button>
            </div>
          ) : (
            <form className="form" onSubmit={saveDetails}>
              <label>
                Name
                <input
                  value={detailsForm.name}
                  onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Kunde
                <input
                  value={detailsForm.kunde}
                  onChange={(e) => setDetailsForm({ ...detailsForm, kunde: e.target.value })}
                />
              </label>
              <div className="row">
                <label>
                  Montageplatz
                  <select
                    value={detailsForm.montageplatzId}
                    onChange={(e) => setDetailsForm({ ...detailsForm, montageplatzId: e.target.value })}
                    required
                  >
                    {montageplaetze.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Startdatum
                  <input
                    type="date"
                    value={detailsForm.startDatum}
                    onChange={(e) => setDetailsForm({ ...detailsForm, startDatum: e.target.value })}
                    required
                  />
                </label>
              </div>
              <div className="actions">
                <button type="submit" className="primary">
                  Speichern
                </button>
                <button type="button" onClick={() => setEditingDetails(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          <h3>Vorgänge</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Start</th>
                <th>Ende</th>
                <th>Dauer (Tage)</th>
                <th>Typ</th>
                <th>Team</th>
                <th>Kapazität</th>
                <th>Anlagenteil</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedVorgaenge.length === 0 && (
                <tr>
                  <td colSpan={10} className="muted">
                    Noch keine Vorgänge.
                  </td>
                </tr>
              )}
              {sortedVorgaenge.map((vorgang, i) => (
                <tr key={vorgang.id}>
                  <td>{i + 1}</td>
                  <td>{vorgang.name}</td>
                  <td>{formatDate(vorgang.startDatum)}</td>
                  <td>{formatDate(lastWorkday(vorgang.startDatum, vorgang.dauerTage))}</td>
                  <td>{vorgang.dauerTage}</td>
                  <td>{VORGANG_TYP_LABEL[vorgang.typ]}</td>
                  <td>{teamName(vorgang.teamId)}</td>
                  <td>{vorgang.kapazitaetsbedarf ?? '–'}</td>
                  <td>{projektAnlagenteilName(vorgang.anlagenteilBedarfId)}</td>
                  <td className="actions-cell">
                    <button onClick={() => moveVorgang(sortedVorgaenge, i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      onClick={() => moveVorgang(sortedVorgaenge, i, 1)}
                      disabled={i === sortedVorgaenge.length - 1}
                    >
                      ↓
                    </button>
                    <button onClick={() => startEditVorgang(vorgang)}>Bearbeiten</button>
                    <button className="danger" onClick={() => deleteVorgang(vorgang.id)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form className="form" onSubmit={submitVorgang}>
            <h3>{editingVorgangId ? 'Vorgang bearbeiten' : 'Vorgang einfügen'}</h3>
            <label>
              Name
              <input
                value={vorgangForm.name}
                onChange={(e) => setVorgangForm({ ...vorgangForm, name: e.target.value })}
                required
              />
            </label>
            <div className="row">
              <label>
                Dauer (Tage)
                <input
                  type="number"
                  min={0}
                  value={vorgangForm.dauerTage}
                  onChange={(e) => setVorgangForm({ ...vorgangForm, dauerTage: Number(e.target.value) })}
                />
              </label>
              <label>
                Typ
                <select
                  value={vorgangForm.typ}
                  onChange={(e) => setVorgangForm({ ...vorgangForm, typ: e.target.value as VorgangTyp })}
                >
                  {Object.entries(VORGANG_TYP_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row">
              <label>
                Team
                <select
                  value={vorgangForm.teamId}
                  onChange={(e) => setVorgangForm({ ...vorgangForm, teamId: e.target.value })}
                >
                  <option value="">– kein Team –</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kapazitätsbedarf
                <input
                  type="number"
                  min={0}
                  value={vorgangForm.kapazitaetsbedarf}
                  onChange={(e) =>
                    setVorgangForm({ ...vorgangForm, kapazitaetsbedarf: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <label>
              Benötigtes Anlagenteil
              <select
                value={vorgangForm.anlagenteilBedarfId}
                onChange={(e) => setVorgangForm({ ...vorgangForm, anlagenteilBedarfId: e.target.value })}
              >
                <option value="">– kein Teil erforderlich –</option>
                {selectedProjekt.anlagenteile.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            {!editingVorgangId && (
              <label>
                Position
                <select
                  value={vorgangForm.position}
                  onChange={(e) => setVorgangForm({ ...vorgangForm, position: Number(e.target.value) })}
                >
                  {sortedVorgaenge.map((v, i) => (
                    <option key={v.id} value={i}>
                      Vor {i + 1}. {v.name}
                    </option>
                  ))}
                  <option value={sortedVorgaenge.length}>Am Ende anfügen</option>
                </select>
              </label>
            )}
            <div className="actions">
              <button type="submit" className="primary">
                {editingVorgangId ? 'Speichern' : 'Hinzufügen'}
              </button>
              {editingVorgangId && (
                <button type="button" onClick={cancelEditVorgang}>
                  Abbrechen
                </button>
              )}
            </div>
          </form>

          <h3>Anlagenteile / Liefertermine</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Katalog-Anlagenteil</th>
                <th>Verfügbar ab</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {selectedProjekt.anlagenteile.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Noch keine Anlagenteile.
                  </td>
                </tr>
              )}
              {selectedProjekt.anlagenteile.map((teil) => (
                <tr key={teil.id}>
                  <td>{teil.name}</td>
                  <td>{anlagenteilName(teil.anlagenteilId)}</td>
                  <td>{formatDate(teil.verfuegbarAb)}</td>
                  <td className="actions-cell">
                    <button onClick={() => startEditAnlagenteil(teil)}>Bearbeiten</button>
                    <button className="danger" onClick={() => deleteAnlagenteil(teil.id)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form className="form" onSubmit={submitAnlagenteil}>
            <h3>{editingAnlagenteilId ? 'Anlagenteil bearbeiten' : 'Anlagenteil hinzufügen'}</h3>
            <label>
              Name
              <input
                value={anlagenteilForm.name}
                onChange={(e) => setAnlagenteilForm({ ...anlagenteilForm, name: e.target.value })}
                required
              />
            </label>
            <div className="row">
              <label>
                Katalog-Anlagenteil
                <select
                  value={anlagenteilForm.anlagenteilId}
                  onChange={(e) => setAnlagenteilForm({ ...anlagenteilForm, anlagenteilId: e.target.value })}
                >
                  <option value="">– kein Katalogbezug –</option>
                  {anlagenteile.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Verfügbar ab
                <input
                  type="date"
                  value={anlagenteilForm.verfuegbarAb}
                  onChange={(e) => setAnlagenteilForm({ ...anlagenteilForm, verfuegbarAb: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="actions">
              <button type="submit" className="primary">
                {editingAnlagenteilId ? 'Speichern' : 'Hinzufügen'}
              </button>
              {editingAnlagenteilId && (
                <button type="button" onClick={cancelEditAnlagenteil}>
                  Abbrechen
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
