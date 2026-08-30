import { useMemo, type ReactNode } from 'react';
import { Provider as StoreProvider } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { AppContainer } from '../shared/di/container';
import { DiProvider } from '../shared/di/DiProvider';
import { makeStore } from '../shared/api/store';
import { AuthProvider, LoginPage, ProtectedRoute, RequireRole } from '../features/auth';
import { DashboardPage } from '../features/dashboard';
import { StudentsPage } from '../features/students';
import { AppShell } from './shell/AppShell';
import { SectionPlaceholder } from './shell/SectionPlaceholder';
import { DESTINATIONS } from './shell/navigation';
import { DesignSystem } from '../dev/DesignSystem';
import '../shared/i18n';

/* The screens that are built. A destination with no entry here still renders
   the honest placeholder, so adding a screen is one line and the registry stays
   the single source of paths and gating. */
const BUILT_SCREENS: Record<string, ReactNode> = {
  dashboard: <DashboardPage />,
  students: <StudentsPage />,
};

function screenFor(destinationKey: string): ReactNode {
  return BUILT_SCREENS[destinationKey] ?? <SectionPlaceholder />;
}

/** Wires the container into React, then declares the route table.
 *
 *  The container is built by the caller (`main.tsx`) rather than here, so the
 *  composition root stays at the program's edge and this component has no idea
 *  which implementations it is running against.
 *
 *  Routes are generated from the navigation registry so paths and role gating
 *  live in one place: an open destination is reachable by any signed-in user, a
 *  head-teacher-only one is wrapped in `RequireRole` and 403s for a teacher. */
export function App({ container }: { container: AppContainer }) {
  const openDestinations = DESTINATIONS.filter((d) => !d.headTeacherOnly);
  const gatedDestinations = DESTINATIONS.filter((d) => d.headTeacherOnly);

  /* One store for the app's lifetime, built from the same transport the
     container holds. Memoised on the container so a re-render never rebuilds the
     cache, while a test that mounts a fresh container gets its own store. */
  const store = useMemo(() => makeStore(container.http), [container.http]);

  return (
    <DiProvider container={container}>
      <StoreProvider store={store}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Dev-only reference gallery; excluded from the production bundle. */}
            {import.meta.env.DEV ? <Route path="/ds" element={<DesignSystem />} /> : null}

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                {openDestinations.map((d) => (
                  <Route key={d.key} path={d.path} element={screenFor(d.key)} />
                ))}
                <Route element={<RequireRole allow="head_teacher" />}>
                  {gatedDestinations.map((d) => (
                    <Route key={d.key} path={d.path} element={screenFor(d.key)} />
                  ))}
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </StoreProvider>
    </DiProvider>
  );
}
