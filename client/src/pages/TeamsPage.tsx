import { StammdatenListe, type Field } from '../components/StammdatenListe';
import type { Team } from '../types';

const fields: Field<Team>[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'kapazitaetProTag', label: 'Kapazität / Tag', type: 'number' },
];

export default function TeamsPage() {
  return (
    <StammdatenListe<Team>
      resource="teams"
      title="Teams"
      fields={fields}
      emptyItem={{ name: '', kapazitaetProTag: 1 }}
    />
  );
}
