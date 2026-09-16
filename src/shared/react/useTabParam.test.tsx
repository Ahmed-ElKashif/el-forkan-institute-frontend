// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useTabParam } from './useTabParam';

/* `?tab=` is what lets a retired route redirect into a specific tab, so the
   parsing has to survive a query string a user can edit by hand. */

const KEYS = ['one', 'two'] as const;

function Probe({ paramName }: { paramName?: string } = {}) {
  const [tab, setTab] = useTabParam<(typeof KEYS)[number]>(KEYS, 'one', paramName);
  const { search } = useLocation();
  return (
    <div>
      <span data-active={tab}>active: {tab}</span>
      <span>search: {search}</span>
      <button type="button" onClick={() => setTab('two')}>
        go two
      </button>
    </div>
  );
}

function renderAt(entry: string, paramName?: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe paramName={paramName} />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('useTabParam', () => {
  it('reads the active tab from the query string', () => {
    renderAt('/x?tab=two');
    expect(screen.getByText('active: two')).toBeDefined();
  });

  it('falls back when the tab is absent', () => {
    renderAt('/x');
    expect(screen.getByText('active: one')).toBeDefined();
  });

  it('falls back rather than rendering nothing for an unknown tab', () => {
    renderAt('/x?tab=deleted-long-ago');
    expect(screen.getByText('active: one')).toBeDefined();
  });

  it('writes the chosen tab into the URL', async () => {
    renderAt('/x');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'go two' }));

    expect(screen.getByText('active: two')).toBeDefined();
    expect(screen.getByText('search: ?tab=two')).toBeDefined();
  });

  it('keeps other query parameters when switching tabs', async () => {
    // A screen may carry its own state in the URL alongside the tab.
    renderAt('/x?page=3');
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'go two' }));

    expect(screen.getByText('search: ?page=3&tab=two')).toBeDefined();
  });

  it('reads and writes a custom param so a nested tabset does not collide', async () => {
    // The level hub nests the catalogue's tabs under `?cat=` while keeping its
    // own on `?tab=`; both must coexist in one URL.
    renderAt('/x?tab=one&cat=two', 'cat');
    const user = userEvent.setup();

    expect(screen.getByText('active: two')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'go two' }));

    expect(screen.getByText('search: ?tab=one&cat=two')).toBeDefined();
  });
});
