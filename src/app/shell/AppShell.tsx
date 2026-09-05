import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, SideNav, TopBar, cn, formatHijriDate, type NavItem } from '../../ds';
import { useAuth } from '../../features/auth';
import { DESTINATIONS, activeDestination } from './navigation';

/** The signed-in frame: role-scoped sidebar, page header with the sign-out
 *  control, and the routed screen.
 *
 *  Rendered inside `ProtectedRoute`, so a user is always present. It owns
 *  nothing a screen owns — no data, no domain logic. Its job is to place the
 *  navigation, name the current section, carry sign-out, and route selections.
 *  The sidebar and titles are built from the one registry in `navigation.ts`. */
export function AppShell() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  // Mobile drawer state. On lg+ the sidebar is a permanent rail and this is
  // ignored; below lg it is an off-canvas drawer. It closes on nav-item select
  // and scrim tap (below) — the only things reachable while it is open.
  const [navOpen, setNavOpen] = useState(false);

  const active = activeDestination(pathname);
  /* Guaranteed non-null by ProtectedRoute; the fallback only satisfies the type
     and fails safe to the narrower sidebar rather than leaking gated items. */
  const role = user?.role ?? 'teacher';

  const items: NavItem[] = DESTINATIONS.map((destination) => ({
    key: destination.key,
    label: t(destination.labelKey),
    icon: destination.icon,
    group: t(destination.groupKey),
    headTeacherOnly: destination.headTeacherOnly,
  }));

  function handleSelect(key: string) {
    const target = DESTINATIONS.find((destination) => destination.key === key);
    if (target) navigate(target.path);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    // overflow-x-hidden keeps the off-canvas mobile drawer (translated past the
    // start edge when closed) from adding a horizontal scrollbar. It does not
    // clip the open drawer, which is `fixed` to the viewport.
    <div className="flex min-h-screen overflow-x-hidden bg-app">
      {/* Scrim behind the mobile drawer; tapping it or any nav item closes the
          drawer. Never shown on lg+, where the rail is permanent. */}
      {navOpen ? (
        <button
          type="button"
          aria-label={t('common.closeMenu')}
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-scrim lg:hidden"
        />
      ) : null}

      <SideNav
        items={items}
        active={active.key}
        role={role}
        onSelect={(key) => {
          handleSelect(key);
          setNavOpen(false);
        }}
        className={cn(
          // Off-canvas drawer on mobile (slides in from the RTL start edge),
          // permanent rail from lg up.
          'fixed inset-y-0 start-0 z-50 transition-transform duration-[var(--dur-base)] ease-standard',
          'lg:static lg:z-auto lg:translate-x-0',
          navOpen ? 'translate-x-0 shadow-modal' : 'translate-x-full lg:translate-x-0',
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenu={() => setNavOpen(true)}
          title={t(active.labelKey)}
          date={formatHijriDate()}
          user={user ? { name: user.fullName, role: user.role } : undefined}
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon="log-out"
              iconMirror
              loading={signingOut}
              onClick={handleSignOut}
            >
              {t('common.signOut')}
            </Button>
          }
        />

        {/* One page gutter for every in-shell screen: comfortable padding so
            nothing renders flush to the edges, but full width — the wide
            attendance/score grids fill the viewport (minus the sidebar), and a
            page that wants a narrow reading measure sets its own max-width.
            ponytail: uncapped; add a max-w if an ultrawide monitor sprawls. */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="w-full px-4 py-6 sm:px-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
