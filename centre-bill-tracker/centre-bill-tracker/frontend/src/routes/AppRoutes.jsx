import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import CentresPage from '../pages/CentresPage';
import BillsPage from '../pages/BillsPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />

      {/* Centre Management: view is open to both roles inside the page itself
          (Admin sees management actions, Operations sees a read-only list),
          matching the SRD's permission split rather than blocking the route. */}
      <Route
        path="/centres"
        element={(
          <ProtectedRoute>
            <CentresPage />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/bills"
        element={(
          <ProtectedRoute>
            <BillsPage />
          </ProtectedRoute>
        )}
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
