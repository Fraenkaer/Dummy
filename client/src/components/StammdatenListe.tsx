import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';

export interface Field<T> {
  key: keyof Omit<T, 'id'>;
  label: string;
  type: 'text' | 'number' | 'textarea';
}

interface Props<T extends { id: string }> {
  resource: string;
  title: string;
  fields: Field<T>[];
  emptyItem: Omit<T, 'id'>;
}

export function StammdatenListe<T extends { id: string }>({
  resource,
  title,
  fields,
  emptyItem,
}: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [form, setForm] = useState<Omit<T, 'id'>>(emptyItem);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setItems(await api.list<T>(resource));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (editingId) {
      await api.update<T>(resource, editingId, form);
    } else {
      await api.create<T>(resource, form);
    }
    setForm(emptyItem);
    setEditingId(null);
    await load();
  }

  function startEdit(item: T) {
    setEditingId(item.id);
    const { id, ...rest } = item;
    void id;
    setForm(rest as Omit<T, 'id'>);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyItem);
  }

  async function handleDelete(id: string) {
    if (!confirm('Wirklich löschen?')) return;
    await api.remove(resource, id);
    if (editingId === id) cancelEdit();
    await load();
  }

  function updateField(key: keyof Omit<T, 'id'>, value: string, type: Field<T>['type']) {
    setForm((prev) => ({
      ...prev,
      [key]: type === 'number' ? Number(value) : value,
    }));
  }

  return (
    <div className="page">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={String(f.key)}>{f.label}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={fields.length + 1} className="muted">
                Noch keine Einträge.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <tr key={item.id}>
              {fields.map((f) => (
                <td key={String(f.key)}>{String(item[f.key] ?? '')}</td>
              ))}
              <td className="actions-cell">
                <button onClick={() => startEdit(item)}>Bearbeiten</button>
                <button className="danger" onClick={() => handleDelete(item.id)}>
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form className="form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h3>
        {fields.map((f) => (
          <label key={String(f.key)}>
            {f.label}
            {f.type === 'textarea' ? (
              <textarea
                value={(form[f.key] as string) ?? ''}
                onChange={(e) => updateField(f.key, e.target.value, f.type)}
              />
            ) : (
              <input
                type={f.type}
                value={(form[f.key] as string | number) ?? (f.type === 'number' ? 0 : '')}
                onChange={(e) => updateField(f.key, e.target.value, f.type)}
                required={f.type === 'text'}
              />
            )}
          </label>
        ))}
        <div className="actions">
          <button type="submit" className="primary">
            {editingId ? 'Speichern' : 'Hinzufügen'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              Abbrechen
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
