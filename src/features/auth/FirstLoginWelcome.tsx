import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLoader } from '../../ds';
import type { AuthUser } from './auth.model';
import { useAuth, type AuthStatus } from './auth-context';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** The ceremonial splash, shown once, while the shell boots behind it. */
function WelcomeOverlay({ user, onDone }: { user: AuthUser; onDone: () => void }) {
  const { t } = useTranslation();
  // A once-per-device beat: generous when animated, brief when motion is off.
  const minVisibleMs = prefersReducedMotion() ? 1100 : 2300;

  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  });

  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const hold = window.setTimeout(() => setClosing(true), minVisibleMs);
    // After the hold, dissolve, then hand back so the flag is set and we unmount.
    const done = window.setTimeout(
      () => finish.current(),
      minVisibleMs + (prefersReducedMotion() ? 0 : 360),
    );
    return () => {
      window.clearTimeout(hold);
      window.clearTimeout(done);
    };
  }, [minVisibleMs]);

  const firstName = user.fullName.trim().split(/\s+/)[0] || user.fullName;

  return (
    <BrandLoader
      closing={closing}
      institute={t('auth.welcome.institute')}
      subtitle={t('auth.welcome.subtitle')}
      greeting={t('auth.welcome.greeting', { name: firstName })}
      loadingLabel={t('auth.welcome.loading')}
    />
  );
}

/** Gate that plays {@link WelcomeOverlay} every time an admin (head teacher)
 *  arrives at an authenticated session — whether by signing in or by opening the
 *  site with a session still restored from the cookie. Mounted once, at the app
 *  root inside the auth provider; renders nothing for teachers, and never on
 *  in-app navigation (which does not change `status`). */
export function FirstLoginWelcome() {
  const { status, user } = useAuth();
  const [show, setShow] = useState(false);
  // Fire only on a real transition INTO authenticated (checking→authenticated on
  // boot, or anonymous→authenticated on sign-in), never on an incidental
  // re-render while already authenticated.
  const prevStatus = useRef<AuthStatus>(status);

  // Layout effect, not a plain effect: it runs before the browser paints, so the
  // overlay covers the freshly-mounted dashboard in the same frame — no flash of
  // the home screen before the welcome appears.
  useLayoutEffect(() => {
    const entered = status === 'authenticated' && prevStatus.current !== 'authenticated';
    prevStatus.current = status;
    if (entered && user && user.role === 'head_teacher') {
      setShow(true);
    }
  }, [status, user]);

  if (!show || !user) return null;

  return <WelcomeOverlay user={user} onDone={() => setShow(false)} />;
}
