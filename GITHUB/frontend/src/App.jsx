import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from './context/PersonaContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CasePage from './components/CasePage';
import AlertsPage from './components/AlertsPage';
import KnowledgeGraph from './components/KnowledgeGraph';
import CalibrationPage from './components/CalibrationPage';
import ChatPage from './components/ChatPage';
import SparseHistoryPage from './components/SparseHistoryPage';
import DataConnectorsPage from './components/DataConnectorsPage';
import ScenarioSimulatorPage from './components/ScenarioSimulatorPage';
import ActionOutcomesPage from './components/ActionOutcomesPage';


function App() {
  return (
    <PersonaProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="case/:region/:weekStart" element={<CasePage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="connectors" element={<DataConnectorsPage />} />
            <Route path="simulator" element={<ScenarioSimulatorPage />} />
            <Route path="calibration" element={<CalibrationPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="sparse-history" element={<SparseHistoryPage />} />
            <Route path="action-outcomes" element={<ActionOutcomesPage />} />
          </Route>
        </Routes>
      </Router>
    </PersonaProvider>
  );
}

export default App;
