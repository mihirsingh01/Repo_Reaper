import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

import { LoginPage } from './pages/LoginPage';
import { NewIdeaPage } from './pages/NewIdeaPage';
import { ResultsPage } from './pages/ResultsPage';
import { RepoReportPage } from './pages/RepoReportPage';
import { FounderBriefPage } from './pages/FounderBriefPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-slate-100">
            <Navbar />

            <main className="flex-1">
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/new"
                  element={
                    <ProtectedRoute>
                      <NewIdeaPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/results/:ideaId"
                  element={
                    <ProtectedRoute>
                      <ResultsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analyses/:id"
                  element={
                    <ProtectedRoute>
                      <RepoReportPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analyses/:id/brief"
                  element={
                    <ProtectedRoute>
                      <FounderBriefPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <HistoryPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPage />
                    </AdminRoute>
                  }
                />

                {/* Default redirect to /new */}
                <Route path="/" element={<Navigate to="/new" replace />} />
                <Route path="*" element={<Navigate to="/new" replace />} />
              </Routes>
            </main>

            <footer className="border-t border-slate-900/80 px-6 py-4 text-center text-xs text-slate-500 no-print">
              RepoRevive &bull; B.Tech Final Year Project &bull; Zero-Execution Safety &bull; Deterministic Scoring
            </footer>
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
