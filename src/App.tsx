/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ReportCard from './pages/ReportCard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { currentUser } = useStore();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(currentUser.role)) {
    // Redirect to their respective dashboard
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { currentUser, loading } = useStore();
  const [showSlowMessage, setShowSlowMessage] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => setShowSlowMessage(true), 2500);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 p-8 text-center max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div>
            <h1 className="text-slate-900 font-bold text-xl">
              {showSlowMessage ? 'Connection Slow' : 'Opening Portal'}
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              {showSlowMessage 
                ? 'Cloud sync is slow. You can wait or proceed in offline mode.' 
                : 'Connecting to Grand Campus Portal...'}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => {
                localStorage.setItem('campus_bypass_loading', 'true');
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-md"
            >
              Skip & Open Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to={`/${currentUser.role}`} replace />} />
      
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/teacher/*" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/student/*" element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />

      <Route path="/report/:studentId" element={
        <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
          <ReportCard />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to={currentUser ? `/${currentUser.role}` : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <AppRoutes />
      </Router>
    </StoreProvider>
  );
}
