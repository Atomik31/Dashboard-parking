import { useMemo } from 'react';
import HistoryChart from '../components/HistoryChart.jsx';
import Header from '../components/Header.jsx';
import Loader from '../components/Loader.jsx';
import ParkingList from '../components/ParkingList.jsx';
import ParkingMap from '../components/ParkingMap.jsx';
import { useParkings } from '../hooks/useParkings.js';
import { trierParkings } from '../lib/format.js';

export default function Dashboard() {
  const { data, loading, error, actualiser } = useParkings();
  const parkings = useMemo(() => (data ? trierParkings(data.parkings) : []), [data]);

  return (
    <main className="pk-page">
      <Header derniereMaj={data?.updatedAtLabel} onActualiser={actualiser} disabled={loading} />
      {error && (
        <div className="pk-info pk-error" role="alert">
          {error}
        </div>
      )}
      {data && (
        <div className="pk-grid">
          <ParkingList parkings={parkings} />
          <ParkingMap parkings={parkings} />
        </div>
      )}
      {data && <HistoryChart />}
      {loading && <Loader message="Récupération des données des parkings..." />}
    </main>
  );
}
