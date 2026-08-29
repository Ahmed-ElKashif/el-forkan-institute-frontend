import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { AppContainer } from '../shared/di/container';
import { DiProvider } from '../shared/di/DiProvider';
import { AuthProvider, LoginPage, ProtectedRoute } from '../features/auth';
import { HomePage } from '../features/home';
import { DesignSystem } from '../dev/DesignSystem';
import '../shared/i18n';

/** Wires the container into React, then declares the route table.
 *
 *  The container is built by the caller (`main.tsx`) rather than here, so the
 *  composition root stays at the program's edge and this component has no idea
 *  which implementations it is running against. */
export function App({ container }: { container: AppContainer }) {
  return (
    <DiProvider container={container}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Dev reference for the design system; F0c moves it behind a flag. */}
            <Route path="/ds" element={<DesignSystem />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DiProvider>
  );
}
