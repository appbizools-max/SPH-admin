import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import BranchDashboard from './pages/BranchDashboard';
import AttendanceManager from './pages/AttendanceManager';
import TargetManagement from './pages/TargetManagement';
import StaffWorkingHours from './pages/StaffWorkingHours';
import ReceptionDashboard from './pages/reception/ReceptionDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import HRDashboard from './pages/hr/HRDashboard';

function App() {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="loader">Loading...</div>
    </div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={
          !user ? <Navigate to="/login" /> : 
          userData?.role === 'superadmin' ? <SuperAdminDashboard /> : 
          userData?.role === 'hr' ? <HRDashboard /> :
          userData?.role === 'doctor' ? <DoctorDashboard /> :
          userData?.role === 'receptionist' ? <ReceptionDashboard /> :
          <BranchDashboard />
        } />
        <Route path="/attendance" element={!user ? <Navigate to="/login" /> : <AttendanceManager />} />
        <Route path="/working-hours" element={!user ? <Navigate to="/login" /> : <StaffWorkingHours />} />
        <Route path="/targets" element={!user ? <Navigate to="/login" /> : <TargetManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
