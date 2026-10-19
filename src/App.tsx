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
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CampusRegistration from './pages/CampusRegistration';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { currentUser, campuses, allCampuses, logout } = useStore();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(currentUser.role)) {
    // Redirect to their respective dashboard
    return <Navigate to={`/${currentUser.role}`} replace />;
  }

  // If user is not super_admin, verify their campus is not suspended by Super Admin
  if (currentUser.role !== 'super_admin') {
    const campusPool = (allCampuses && allCampuses.length > 0) ? allCampuses : campuses;
    const userCampus = currentUser.campusId 
      ? campusPool.find(c => c.id === currentUser.campusId) 
      : (currentUser.role === 'admin' 
          ? campusPool.find(c => c.adminName?.toLowerCase() === currentUser.name?.toLowerCase() || c.adminEmail?.toLowerCase() === currentUser.name?.toLowerCase()) 
          : campusPool.find(c => c.id === 'campus_grand'));

    if (userCampus && (userCampus.status === 'suspended' || userCampus.status === 'deactivated')) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 border border-rose-500/30 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block mb-3">
              Campus Suspended by Super Admin
            </span>
            <h2 className="text-xl font-black text-white mb-2">{userCampus.name}</h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-medium">
              Access to this educational portal has been suspended by the platform Super Admin. All administrative actions, teacher evaluations, marks management, and student portal access are currently locked.
            </p>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-400 text-xs mb-6 text-left space-y-1">
              <div><span className="text-slate-500">Campus Slug:</span> /campus/{userCampus.slug}</div>
              <div><span className="text-slate-500">Administrator:</span> {userCampus.adminName}</div>
              <div><span className="text-slate-500">Contact:</span> {userCampus.adminEmail}</div>
            </div>
            <button
              onClick={() => {
                logout();
                window.location.href = '#/login';
              }}
              className="w-full py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Log Out & Return to Platform
            </button>
          </div>
        </div>
      );
    }
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
                : 'Connecting to Campus SaaS Platform...'}
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
      <Route path="/register" element={<CampusRegistration />} />
      <Route path="/campus/:slug" element={<CampusRegistration />} />
      
      <Route path="/super_admin/*" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />

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
        <ProtectedRoute allowedRoles={['admin', 'teacher', 'student', 'super_admin']}>
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
