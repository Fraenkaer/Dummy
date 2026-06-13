import { StammdatenListe, type Field } from '../components/StammdatenListe';
import type { Anlagenteil } from '../types';

const fields: Field<Anlagenteil>[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'beschreibung', label: 'Beschreibung', type: 'textarea' },
];

export default function AnlagenteilePage() {
  return (
    <StammdatenListe<Anlagenteil>
      resource="anlagenteile"
      title="Anlagenteile / Vorprodukte"
      fields={fields}
      emptyItem={{ name: '', beschreibung: '' }}
    />
  );
}
