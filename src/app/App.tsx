import { useMemo, type ReactNode } from 'react';
import { Provider as StoreProvider } from 'react-redux';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { AppContainer } from '../shared/di/container';
import { DiProvider } from '../shared/di/DiProvider';
import { makeStore } from '../shared/api/store';
import { AuthProvider, LoginPage, ResetPasswordPage, ProtectedRoute, RequireRole, FirstLoginWelcome } from '../features/auth';
import { DashboardPage } from '../features/dashboard';
import { StudentProfilePage } from '../features/students';
import { LevelsPage, LevelDetailPage, LevelAttendancePage } from '../features/levels';
import { OpenExamsPage, ScoreGridPage } from '../features/scores';
import { EligibilityPage, EligibilityPrintPage } from '../features/eligibility';
import { TermClosePage, TermResultsPage } from '../features/termresults';
import { CataloguePage } from '../features/catalogue';
import { PromotionPage } from '../features/promotion';
import { ImportExportPage } from '../features/import';
import { CertificatesPage, CertificatePrintPage } from '../features/certificates';
import { AuditPage } from '../features/audit';
import { UsersPage } from '../features/users';
import { AcademicYearsPage } from '../features/calendar';
import { WhatsAppPage } from '../features/whatsapp';
import { ProfilePage } from '../features/profile';
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
  levels: <LevelsPage />,
  /* The two daily tasks open on what is actually outstanding, and they differ
     because their unit of work differs. Attendance is marked per class per day,
     so its nav is the cohort picker and a row opens that class's sheet. Marks
     belong to an *exam*, not to a class, so the Scores nav lists the exams still
     awaiting them and a row opens its grid — the level, cohort and exam day the
     teacher used to pick through were never really choices. */
  attendance: <LevelsPage linkTab="attendance" />,
  scores: <OpenExamsPage />,
  /* Head-teacher-only; gated in the route table via the registry's flag. */
  catalogue: <CataloguePage />,
  termClose: <TermClosePage />,
  promotion: <PromotionPage />,
  imports: <ImportExportPage />,
  certificates: <CertificatesPage />,
  audit: <AuditPage />,
  users: <UsersPage />,
  academicYears: <AcademicYearsPage />,
  whatsapp: <WhatsAppPage />,
  settings: <SettingsPage />,
  profile: <ProfilePage />,
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
                {/* The standalone students list folded into the level rosters
                    (add/edit/withdraw + search live there). The retired list
                    redirects to the level hub; both roles may follow it. */}
                <Route path="/students" element={<Navigate to="/levels" replace />} />
                {/* A student's profile, reached from a roster row. Both roles
                    may open one they can reach; branch visibility is enforced in
                    the service, as it is for the roster itself. */}
                <Route path="/students/:id" element={<StudentProfilePage />} />
                {/* The level hub. Open to both roles: a teacher enters it for a
                    level's attendance and scores, while its head-teacher-only
                    tabs (catalogue, class days, teachers) are gated inside the
                    screen by role, not at the route. */}
                <Route path="/levels/:levelId" element={<LevelDetailPage />} />
                {/* The teacher's daily task flows: the Attendance and Scores nav
                    entries are level pickers, and a row opens the level's own
                    attendance/scores here — staying on the task route instead of
                    bouncing into the level hub. Both roles enter. */}
                <Route path="/attendance/:levelId" element={<LevelAttendancePage />} />
                {/* Retired: a level's exam list is the hub's scores tab, and the
                    Scores nav now opens the exams awaiting marks, so this route
                    duplicated both and was reachable from neither. */}
                <Route path="/scores/:levelId" element={<Navigate to="/levels" replace />} />
                {/* The score grid, reached from the Scores nav or a level's
                    scores tab. Both roles enter; score lock and correction are
                    gated inside the screen. The static `exams` segment outranks
                    `/scores/:levelId`. */}
                <Route path="/scores/exams/:examId" element={<ScoreGridPage />} />
                {/* An exam's eligible-students list, reached from the exam
                    picker; both roles compute, view and print it. */}
                <Route path="/exams/:examId/eligibility" element={<EligibilityPage />} />
                {/* A section+term's results; both roles compute, only the head
                    teacher finalizes (gated in the screen and again server-side). */}
                <Route path="/term-results/:sectionId/:termId" element={<TermResultsPage />} />
                <Route element={<RequireRole allow="head_teacher" />}>
                  {gatedDestinations.map((d) => (
                    <Route key={d.key} path={d.path} element={screenFor(d.key)} />
                  ))}
                  {/* Retired routes fold into the level hub, which absorbed the
                      section list, the class detail and the weekly timetable — a
                      level owns both gendered classes and schedules them per day.
                      Existing links and bookmarks still land somewhere useful. */}
                  <Route path="/sections" element={<Navigate to="/levels" replace />} />
                  <Route path="/sections/:id" element={<Navigate to="/levels" replace />} />
                  <Route path="/timetable" element={<Navigate to="/levels" replace />} />
                  <Route path="/timetable/:sectionId" element={<Navigate to="/levels" replace />} />
                  {/* The curriculum is a tab of the catalogue it is built from;
                      export is the import's other direction. Both redirect to
                      where they now live. (`/catalogue` is a destination again —
                      the registry routes it above.) */}
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
