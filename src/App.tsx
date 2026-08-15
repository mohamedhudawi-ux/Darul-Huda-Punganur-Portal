/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
  const { currentUser } = useStore();

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
