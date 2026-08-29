import { createContext, useContext, type ReactNode } from 'react';
import type { AppContainer } from './container';

/* React's binding to the container. Components ask for a service; they never
   construct one. Tests render a subtree with a container built from fakes. */
const DiContext = createContext<AppContainer | null>(null);

export function DiProvider({
  container,
  children,
}: {
  container: AppContainer;
  children: ReactNode;
}) {
  return <DiContext.Provider value={container}>{children}</DiContext.Provider>;
}

export function useContainer(): AppContainer {
  const container = useContext(DiContext);
  if (!container) {
    throw new Error('useContainer must be used inside <DiProvider>.');
  }
  return container;
}
