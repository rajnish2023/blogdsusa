import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import GalleryPage from "./pages/GalleryPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import BlogListPage from "./pages/BlogListPage";
import BlogEditorPage from "./pages/BlogEditorPage";
import PageListPage from "./pages/PageListPage";
import PageBuilderPage from "./pages/PageBuilderPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MigrationPage from "./pages/MigrationPage";
import SettingsPage from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import LicensingPage from "./pages/LicensingPage";
import EstimatorPage from "./pages/EstimatorPage";
import LicenceRateCard from "./components/Licensing/LicenceRateCard";
import ProtectedRoute from "./auth/ProtectedRoute";

function AppShell({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      <Sidebar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/tools/licence-calculator" element={<LicenceRateCard />} />
      <Route
        path="/gallery"
        element={
          <ProtectedRoute permission="gallery:view">
            <AppShell>
              <GalleryPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute permission="users:view">
            <AppShell>
              <UsersPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <ProfilePage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blog"
        element={
          <ProtectedRoute permission="blog:view">
            <AppShell>
              <BlogListPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blog/new"
        element={
          <ProtectedRoute permission="blog:create">
            <AppShell>
              <BlogEditorPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/blog/:id/edit"
        element={
          <ProtectedRoute permission="blog:edit">
            <AppShell>
              <BlogEditorPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages"
        element={
          <ProtectedRoute permission="pages:view">
            <AppShell>
              <PageListPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/new"
        element={
          <ProtectedRoute permission="pages:create">
            <AppShell>
              <PageBuilderPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pages/:id/edit"
        element={
          <ProtectedRoute permission="pages:edit">
            <AppShell>
              <PageBuilderPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/licensing"
        element={
          <ProtectedRoute permission="licensing:view">
            <AppShell>
              <LicensingPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/estimator"
        element={
          <ProtectedRoute permission="estimator:view">
            <AppShell>
              <EstimatorPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/migrate"
        element={
          <ProtectedRoute>
            <AppShell>
              <MigrationPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/gallery" replace />} />
    </Routes>
  );
}
