import { useMemo, type ReactNode } from 'react';
import { Provider as StoreProvider } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { AppContainer } from '../shared/di/container';
import { DiProvider } from '../shared/di/DiProvider';
import { makeStore } from '../shared/api/store';
import { AuthProvider, LoginPage, ResetPasswordPage, ProtectedRoute, RequireRole, FirstLoginWelcome } from '../features/auth';
import { DashboardPage } from '../features/dashboard';
import { StudentsPage, StudentProfilePage } from '../features/students';
import { SectionsPage, SectionsAdminPage, SectionDetailPage } from '../features/sections';
import { AttendanceGridPage } from '../features/attendance';
import { ExamPickerPage, ScoreGridPage } from '../features/scores';
import { EligibilityPage, EligibilityPrintPage } from '../features/eligibility';
import { TermResultsPage } from '../features/termresults';
import { SessionsPage } from '../features/sessions';
import { ImportExportPage } from '../features/import';
import { CertificatesPage, CertificatePrintPage } from '../features/certificates';
import { PromotionPage } from '../features/promotion';
import { AuditPage } from '../features/audit';
import { UsersPage } from '../features/users';
import { CataloguePage } from '../features/catalogue';
import { WhatsAppPage } from '../features/whatsapp';
import { SettingsPage } from '../features/settings';
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
  sections: <SectionsAdminPage />,
  /* Attendance and scores are always done against a section, so each nav
     destination is the section picker; a row links to the grid at
     `/attendance/:sectionId` or `/scores/:sectionId`, wired below. The shared
     picker only differs by where its rows point and its caption. */
  attendance: <SectionsPage basePath="/attendance" captionKey="sections.pickForAttendance" />,
  scores: <SectionsPage basePath="/scores" captionKey="sections.pickForScores" />,
  /* Head-teacher-only; gated in the route table via the registry's flag. */
  imports: <ImportExportPage />,
  certificates: <CertificatesPage />,
  promotion: <PromotionPage />,
  audit: <AuditPage />,
  users: <UsersPage />,
  catalogue: <CataloguePage />,
  whatsapp: <WhatsAppPage />,
  settings: <SettingsPage />,
};

function screenFor(destinationKey: string): ReactNode {
  return BUILT_SCREENS[destinationKey] ?? <SectionPlaceholder />;
}

/** `/timetable/:sectionId` → the class's timetable tab. Routing, not a feature,
 *  so it lives here rather than inside `features/timetable`. */
function TimetableRedirect() {
  const { sectionId = '' } = useParams();
  return <Navigate to={`/sections/${sectionId}?tab=timetable`} replace />;
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
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* Dev-only reference gallery; excluded from the production bundle. */}
            {import.meta.env.DEV ? <Route path="/ds" element={<DesignSystem />} /> : null}

            <Route element={<ProtectedRoute />}>
              {/* The printable certificate renders outside the shell so the
                  browser prints the A4 sheet alone; still signed-in and
                  head-teacher-gated. */}
              <Route element={<RequireRole allow="head_teacher" />}>
                <Route path="/certificates/:id/print" element={<CertificatePrintPage />} />
              </Route>
              {/* The printable eligible-students roster, outside the shell like
                  the certificate. Both roles may print it (computing and viewing
                  eligibility is a teacher task; only override is head-only). */}
              <Route path="/exams/:examId/eligibility/print" element={<EligibilityPrintPage />} />
              <Route element={<AppShell />}>
                {openDestinations.map((d) => (
                  <Route key={d.key} path={d.path} element={screenFor(d.key)} />
                ))}
                {/* A student's profile, reached from a roster row. Both roles
                    may open one they can reach; branch visibility is enforced in
                    the service, as it is for the roster itself. */}
                <Route path="/students/:id" element={<StudentProfilePage />} />
                {/* Per-section grids reached from the pickers above. Not nav
                    destinations, so they are declared here rather than in the
                    registry; both roles may enter (score lock and correction are
                    gated inside the screen, not at the route). */}
                <Route path="/attendance/:sectionId" element={<AttendanceGridPage />} />
                {/* A section's sessions — reschedule or cancel — reached from
                    the attendance grid. Both roles; writes gated server-side. */}
                <Route path="/sessions/:sectionId" element={<SessionsPage />} />
                <Route path="/scores/:sectionId" element={<ExamPickerPage />} />
                <Route path="/scores/exams/:examId" element={<ScoreGridPage />} />
                {/* An exam's eligible-students list, reached from the exam
                    picker; both roles compute, view and print it. */}
                <Route path="/exams/:examId/eligibility" element={<EligibilityPage />} />
                {/* A section+term's results, reached from the exam picker; both
                    roles compute, only the head teacher finalizes (gated in the
                    screen and again server-side). */}
                <Route path="/term-results/:sectionId/:termId" element={<TermResultsPage />} />
                <Route element={<RequireRole allow="head_teacher" />}>
                  {gatedDestinations.map((d) => (
                    <Route key={d.key} path={d.path} element={screenFor(d.key)} />
                  ))}
                  {/* One class, with its roster, timetable and teachers as tabs.
                      Head-teacher only, like the class writes it hosts. */}
                  <Route path="/sections/:id" element={<SectionDetailPage />} />
                  {/* Retired routes. The timetable used to be a destination with
                      its own picker; both now land on the class that owns the
                      grid, so existing links and bookmarks still work. */}
                  <Route path="/timetable" element={<Navigate to="/sections" replace />} />
                  <Route path="/timetable/:sectionId" element={<TimetableRedirect />} />
                  {/* The curriculum is built out of the catalogue's levels,
                      subjects and books, and export is the import's other
                      direction — both are tabs now, not destinations. */}
                  <Route path="/curriculum" element={<Navigate to="/catalogue?tab=curriculum" replace />} />
                  <Route path="/exports" element={<Navigate to="/imports?tab=export" replace />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* Ceremonial once-per-device welcome for the admin, layered above the
              routes so it covers the shell while the dashboard boots. */}
          <FirstLoginWelcome />
        </BrowserRouter>
      </AuthProvider>
      </StoreProvider>
    </DiProvider>
  );
}
