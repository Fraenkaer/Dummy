import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import './App.css';
import ProjektePage from './pages/ProjektePage';
import KalenderPage from './pages/KalenderPage';
import MontageplaetzePage from './pages/MontageplaetzePage';
import TeamsPage from './pages/TeamsPage';
import AnlagenteilePage from './pages/AnlagenteilePage';
import ArbeitsplaenePage from './pages/ArbeitsplaenePage';

function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <nav className="sidebar">
          <h1>Montageplanung</h1>
          <ul>
            <li>
              <NavLink to="/projekte">Projekte</NavLink>
            </li>
            <li>
              <NavLink to="/kalender">Jahreskalender</NavLink>
            </li>
            <li>
              <NavLink to="/montageplaetze">Montageplätze</NavLink>
            </li>
            <li>
              <NavLink to="/teams">Teams</NavLink>
            </li>
            <li>
              <NavLink to="/anlagenteile">Anlagenteile</NavLink>
            </li>
            <li>
              <NavLink to="/arbeitsplaene">Standard-Arbeitspläne</NavLink>
            </li>
          </ul>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/projekte" replace />} />
            <Route path="/projekte" element={<ProjektePage />} />
            <Route path="/kalender" element={<KalenderPage />} />
            <Route path="/montageplaetze" element={<MontageplaetzePage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/anlagenteile" element={<AnlagenteilePage />} />
            <Route path="/arbeitsplaene" element={<ArbeitsplaenePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
