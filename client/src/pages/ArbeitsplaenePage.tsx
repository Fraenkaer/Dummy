import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import {
  VORGANG_TYP_LABEL,
  type Anlagenteil,
  type ArbeitsplanPhase,
  type StandardArbeitsplan,
  type Team,
  type VorgangTyp,
} from '../types';

interface PhaseForm {
  name: string;
  dauerTage: number;
  typ: VorgangTyp;
  teamId: string;
  kapazitaetsbedarf: number;
  anlagenteilId: string;
}

const emptyPhaseForm: PhaseForm = {
  name: '',
  dauerTage: 1,
  typ: 'standard',
  teamId: '',
  kapazitaetsbedarf: 1,
  anlagenteilId: '',
};

export default function ArbeitsplaenePage() {
  const [plaene, setPlaene] = useState<StandardArbeitsplan[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [anlagenteile, setAnlagenteile] = useState<Anlagenteil[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [newPlanName, setNewPlanName] = useState('');
  const [editingPlan, setEditingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', beschreibung: '' });

  const [phaseForm, setPhaseForm] = useState<PhaseForm>(emptyPhaseForm);
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [p, t, a] = await Promise.all([
      api.list<StandardArbeitsplan>('arbeitsplaene'),
      api.list<Team>('teams'),
      api.list<Anlagenteil>('anlagenteile'),
    ]);
    setPlaene(p);
    setTeams(t);
    setAnlagenteile(a);
  }

  const selectedPlan = plaene.find((p) => p.id === selectedId) ?? null;

  async function createPlan(e: FormEvent) {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    const plan = await api.create<StandardArbeitsplan>('arbeitsplaene', {
      name: newPlanName,
      beschreibung: '',
    });
    setNewPlanName('');
    await loadAll();
    setSelectedId(plan.id);
  }

  async function deletePlan(id: string) {
    if (!confirm('Arbeitsplan wirklich löschen?')) return;
    await api.remove('arbeitsplaene', id);
    if (selectedId === id) setSelectedId(null);
    await loadAll();
  }

  function selectPlan(id: string) {
    setSelectedId(id);
    setEditingPlan(false);
    setEditingPhaseId(null);
    setPhaseForm(emptyPhaseForm);
  }

  function startEditPlan() {
    if (!selectedPlan) return;
    setPlanForm({ name: selectedPlan.name, beschreibung: selectedPlan.beschreibung ?? '' });
    setEditingPlan(true);
  }

  async function savePlan(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    await api.update('arbeitsplaene', selectedPlan.id, planForm);
    setEditingPlan(false);
    await loadAll();
  }

  async function submitPhase(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    const body = {
      name: phaseForm.name,
      dauerTage: Number(phaseForm.dauerTage),
      typ: phaseForm.typ,
      teamId: phaseForm.teamId || null,
      kapazitaetsbedarf: Number(phaseForm.kapazitaetsbedarf),
      anlagenteilId: phaseForm.anlagenteilId || null,
    };
    if (editingPhaseId) {
      await api.update(`arbeitsplaene/${selectedPlan.id}/phasen`, editingPhaseId, body);
    } else {
      await api.create(`arbeitsplaene/${selectedPlan.id}/phasen`, body);
    }
    setPhaseForm(emptyPhaseForm);
    setEditingPhaseId(null);
    await loadAll();
  }

  function startEditPhase(phase: ArbeitsplanPhase) {
    setEditingPhaseId(phase.id);
    setPhaseForm({
      name: phase.name,
      dauerTage: phase.dauerTage,
      typ: phase.typ,
      teamId: phase.teamId ?? '',
      kapazitaetsbedarf: phase.kapazitaetsbedarf ?? 1,
      anlagenteilId: phase.anlagenteilId ?? '',
    });
  }

  function cancelEditPhase() {
    setEditingPhaseId(null);
    setPhaseForm(emptyPhaseForm);
  }

  async function deletePhase(phaseId: string) {
    if (!selectedPlan) return;
    if (!confirm('Phase wirklich löschen?')) return;
    await api.remove(`arbeitsplaene/${selectedPlan.id}/phasen`, phaseId);
    await loadAll();
  }

  async function movePhase(sorted: ArbeitsplanPhase[], index: number, direction: -1 | 1) {
    if (!selectedPlan) return;
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await api.put<StandardArbeitsplan>(`arbeitsplaene/${selectedPlan.id}/phasen-reihenfolge`, {
      order: reordered.map((p) => p.id),
    });
    await loadAll();
  }

  function teamName(id?: string) {
    return teams.find((t) => t.id === id)?.name ?? '–';
  }

  function anlagenteilName(id?: string) {
    return anlagenteile.find((a) => a.id === id)?.name ?? '–';
  }

  const sortedPhasen = selectedPlan
    ? [...selectedPlan.phasen].sort((a, b) => a.reihenfolge - b.reihenfolge)
    : [];

  return (
    <div className="page">
      <h2>Standard-Arbeitspläne</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ width: 260, flexShrink: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plaene.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    Noch keine Arbeitspläne.
                  </td>
                </tr>
              )}
              {plaene.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button
                      onClick={() => selectPlan(p.id)}
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
                  <td className="actions-cell">
                    <button className="danger" onClick={() => deletePlan(p.id)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="form" onSubmit={createPlan}>
            <h3>Neuer Arbeitsplan</h3>
            <label>
              Name
              <input value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} required />
            </label>
            <div className="actions">
              <button type="submit" className="primary">
                Anlegen
              </button>
            </div>
          </form>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedPlan && (
            <p className="muted">Wähle links einen Arbeitsplan aus oder lege einen neuen an.</p>
          )}
          {selectedPlan && (
            <>
              {!editingPlan ? (
                <div style={{ marginBottom: 16 }}>
                  <h3>{selectedPlan.name}</h3>
                  {selectedPlan.beschreibung && <p>{selectedPlan.beschreibung}</p>}
                  <button onClick={startEditPlan}>Details bearbeiten</button>
                </div>
              ) : (
                <form className="form" onSubmit={savePlan}>
                  <label>
                    Name
                    <input
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Beschreibung
                    <textarea
                      value={planForm.beschreibung}
                      onChange={(e) => setPlanForm({ ...planForm, beschreibung: e.target.value })}
                    />
                  </label>
                  <div className="actions">
                    <button type="submit" className="primary">
                      Speichern
                    </button>
                    <button type="button" onClick={() => setEditingPlan(false)}>
                      Abbrechen
                    </button>
                  </div>
                </form>
              )}

              <h3>Phasen / Vorgänge</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Dauer (Tage)</th>
                    <th>Typ</th>
                    <th>Team</th>
                    <th>Kapazität</th>
                    <th>Anlagenteil</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPhasen.length === 0 && (
                    <tr>
                      <td colSpan={8} className="muted">
                        Noch keine Phasen.
                      </td>
                    </tr>
                  )}
                  {sortedPhasen.map((phase, i) => (
                    <tr key={phase.id}>
                      <td>{i + 1}</td>
                      <td>{phase.name}</td>
                      <td>{phase.dauerTage}</td>
                      <td>{VORGANG_TYP_LABEL[phase.typ]}</td>
                      <td>{teamName(phase.teamId)}</td>
                      <td>{phase.kapazitaetsbedarf ?? '–'}</td>
                      <td>{anlagenteilName(phase.anlagenteilId)}</td>
                      <td className="actions-cell">
                        <button onClick={() => movePhase(sortedPhasen, i, -1)} disabled={i === 0}>
                          ↑
                        </button>
                        <button
                          onClick={() => movePhase(sortedPhasen, i, 1)}
                          disabled={i === sortedPhasen.length - 1}
                        >
                          ↓
                        </button>
                        <button onClick={() => startEditPhase(phase)}>Bearbeiten</button>
                        <button className="danger" onClick={() => deletePhase(phase.id)}>
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <form className="form" onSubmit={submitPhase}>
                <h3>{editingPhaseId ? 'Phase bearbeiten' : 'Neue Phase'}</h3>
                <label>
                  Name
                  <input
                    value={phaseForm.name}
                    onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })}
                    required
                  />
                </label>
                <div className="row">
                  <label>
                    Dauer (Tage)
                    <input
                      type="number"
                      min={0}
                      value={phaseForm.dauerTage}
                      onChange={(e) => setPhaseForm({ ...phaseForm, dauerTage: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Typ
                    <select
                      value={phaseForm.typ}
                      onChange={(e) => setPhaseForm({ ...phaseForm, typ: e.target.value as VorgangTyp })}
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
                      value={phaseForm.teamId}
                      onChange={(e) => setPhaseForm({ ...phaseForm, teamId: e.target.value })}
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
                      value={phaseForm.kapazitaetsbedarf}
                      onChange={(e) =>
                        setPhaseForm({ ...phaseForm, kapazitaetsbedarf: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <label>
                  Benötigtes Anlagenteil
                  <select
                    value={phaseForm.anlagenteilId}
                    onChange={(e) => setPhaseForm({ ...phaseForm, anlagenteilId: e.target.value })}
                  >
                    <option value="">– kein Teil erforderlich –</option>
                    {anlagenteile.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="actions">
                  <button type="submit" className="primary">
                    {editingPhaseId ? 'Speichern' : 'Hinzufügen'}
                  </button>
                  {editingPhaseId && (
                    <button type="button" onClick={cancelEditPhase}>
                      Abbrechen
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
