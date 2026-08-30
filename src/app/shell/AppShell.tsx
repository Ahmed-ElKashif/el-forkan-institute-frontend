import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, SideNav, TopBar, type NavItem } from '../../ds';
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
    <div className="flex min-h-screen bg-app">
      <SideNav items={items} active={active.key} role={role} onSelect={handleSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={t(active.labelKey)}
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

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
