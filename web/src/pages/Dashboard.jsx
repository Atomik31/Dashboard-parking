import { useMemo, useState } from 'react';
import HistoryChart from '../components/HistoryChart.jsx';
import Kpis from '../components/Kpis.jsx';
import Loader from '../components/Loader.jsx';
import ParkingList from '../components/ParkingList.jsx';
import ParkingMap from '../components/ParkingMap.jsx';
import Topbar from '../components/Topbar.jsx';
import { useHistory } from '../hooks/useHistory.js';
import { useI18n } from '../hooks/useI18n.jsx';
import { useParkings } from '../hooks/useParkings.js';
import { trierParkings } from '../lib/format.js';
import { serieTotale } from '../lib/insights.js';

export default function Dashboard() {
  const { t } = useI18n();
  const { data, loading, error, actualiser } = useParkings();
  /* Historique des 24 h : courbe du bandeau d'indicateurs et tendance sur 30 min de chaque parking */
  const { rows: rows24 } = useHistory(24);
  const [selection, setSelection] = useState(null);
  const parkings = useMemo(() => (data ? trierParkings(data.parkings) : []), [data]);
  const serie = useMemo(() => serieTotale(rows24), [rows24]);
  const maintenant = useMemo(() => (data?.updatedAt ? Date.parse(data.updatedAt) : Date.now()), [data]);

  return (
    <>
      <Topbar derniereMaj={data?.updatedAtLabel} onActualiser={actualiser} disabled={loading} />
      <main className="wrap">
        <section className="page-head">
          <div>
            <p className="eyebrow">{t.dash_eyebrow}</p>
            <h1>{t.dash_title}</h1>
            <p>{t.dash_intro}</p>
          </div>
        </section>
        {error && (
          <div className="notice error" role="alert">
            {error === 'rate' ? t.err_rate : t.err_fetch}
          </div>
        )}
        {data && (
          <>
            <Kpis parkings={parkings} serie={serie} />
            <section className="main-grid">
              <ParkingMap parkings={parkings} selection={selection} onSelect={setSelection} />
              <ParkingList parkings={parkings} historique={rows24} selection={selection} onSelect={setSelection} maintenant={maintenant} />
            </section>
            <HistoryChart />
          </>
        )}
        {loading && <Loader message={t.loading_parkings} />}
      </main>
    </>
  );
}
