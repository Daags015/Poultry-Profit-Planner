import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { BroilerPlannerPage } from './pages/BroilerPlannerPage';
import { CalendarPage } from './pages/CalendarPage';
import { CycleDetailPage } from './pages/CycleDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LayerPlannerPage } from './pages/LayerPlannerPage';
import { ReportsPage } from './pages/ReportsPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/planner/broiler" element={<BroilerPlannerPage />} />
            <Route path="/planner/layer" element={<LayerPlannerPage />} />
            <Route path="/scenarios" element={<ScenariosPage />} />
            <Route path="/cycles/:id" element={<CycleDetailPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <WhatsAppWidget />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
