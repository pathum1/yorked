import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TeamsPage from './pages/TeamsPage';
import CreateTeamPage from './pages/CreateTeamPage';
import TeamBuilderPage from './pages/TeamBuilderPage';
import MatchesPage from './pages/MatchesPage';
import MatchResultsPage from './pages/MatchResultsPage';
import ConflictPage from './pages/ConflictPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout><HomePage /></Layout>
            </ProtectedRoute>
          } />

          {/* Team routes */}
          <Route path="/teams" element={
            <ProtectedRoute>
              <Layout><TeamsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teams/new" element={
            <ProtectedRoute>
              <Layout><CreateTeamPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/teams/:id" element={
            <ProtectedRoute>
              <Layout><TeamBuilderPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Match routes */}
          <Route path="/matches" element={
            <ProtectedRoute>
              <Layout><MatchesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/matches/:id/results" element={
            <ProtectedRoute>
              <Layout><MatchResultsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/matches/:id/resolve" element={
            <ProtectedRoute>
              <Layout><ConflictPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
