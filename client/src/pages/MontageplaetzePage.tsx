import { StammdatenListe, type Field } from '../components/StammdatenListe';
import type { Montageplatz } from '../types';

const fields: Field<Montageplatz>[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'beschreibung', label: 'Beschreibung', type: 'textarea' },
];

export default function MontageplaetzePage() {
  return (
    <StammdatenListe<Montageplatz>
      resource="montageplaetze"
      title="Montageplätze"
      fields={fields}
      emptyItem={{ name: '', beschreibung: '' }}
    />
  );
}
